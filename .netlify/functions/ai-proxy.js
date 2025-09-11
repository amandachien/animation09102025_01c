const fetch = require('node-fetch');

// Enhanced rate limiting configuration
const RATE_LIMITS = {
    minute: { max: 10, window: 60 * 1000 },
    hour: { max: 50, window: 60 * 60 * 1000 },
    day: { max: 200, window: 24 * 60 * 60 * 1000 }
};

// In-memory storage (resets with function cold starts)
let requestCounts = {};
let usageStats = {
    totalRequests: 0,
    uniqueIPs: new Set(),
    startTime: Date.now(),
    errors: 0,
    rateLimitHits: 0
};

// Clean up old entries periodically
function cleanupOldEntries() {
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(r => r.window));
    
    for (const ip in requestCounts) {
        for (const period in requestCounts[ip]) {
            requestCounts[ip][period] = requestCounts[ip][period]
                .filter(timestamp => now - timestamp < maxWindow);
        }
        
        // Remove empty IP entries
        if (Object.values(requestCounts[ip] || {}).every(arr => arr.length === 0)) {
            delete requestCounts[ip];
        }
    }
}

// Check rate limits for an IP
function checkRateLimit(ip) {
    const now = Date.now();
    
    // Initialize IP tracking if needed
    if (!requestCounts[ip]) {
        requestCounts[ip] = {};
    }
    
    // Check each rate limit period
    for (const [period, config] of Object.entries(RATE_LIMITS)) {
        if (!requestCounts[ip][period]) {
            requestCounts[ip][period] = [];
        }
        
        // Clean old entries for this period
        requestCounts[ip][period] = requestCounts[ip][period]
            .filter(timestamp => now - timestamp < config.window);
        
        // Check if limit exceeded
        if (requestCounts[ip][period].length >= config.max) {
            return { allowed: false, period, limit: config.max };
        }
    }
    
    // Record this request for all periods
    for (const period of Object.keys(RATE_LIMITS)) {
        requestCounts[ip][period].push(now);
    }
    
    return { allowed: true };
}

// Log usage for monitoring
function logUsage(ip, userAgent, prompt, success) {
    usageStats.totalRequests++;
    usageStats.uniqueIPs.add(ip);
    
    if (!success) {
        usageStats.errors++;
    }
    
    // Log to console for monitoring (visible in Netlify function logs)
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        ip: ip.substring(0, 8) + '...', // Partial IP for privacy
        userAgent: userAgent ? userAgent.substring(0, 50) : 'unknown',
        promptLength: prompt ? prompt.length : 0,
        success: success,
        totalRequests: usageStats.totalRequests,
        uniqueIPs: usageStats.uniqueIPs.size
    }));
}

// Get current usage statistics
function getUsageStats() {
    const now = Date.now();
    const uptimeHours = (now - usageStats.startTime) / (1000 * 60 * 60);
    
    return {
        totalRequests: usageStats.totalRequests,
        uniqueIPs: usageStats.uniqueIPs.size,
        errors: usageStats.errors,
        rateLimitHits: usageStats.rateLimitHits,
        uptimeHours: Math.round(uptimeHours * 10) / 10,
        requestsPerHour: Math.round((usageStats.totalRequests / uptimeHours) * 10) / 10,
        activeIPs: Object.keys(requestCounts).length
    };
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Handle stats endpoint for monitoring
    if (event.httpMethod === 'GET' && event.path.includes('/stats')) {
        const stats = getUsageStats();
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify(stats) 
        };
    }

    // Only allow POST for AI requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    // Extract client info
    const ip = event.headers['x-forwarded-for'] || 
              event.headers['client-ip'] || 
              event.headers['x-real-ip'] || 
              'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    // Clean up old entries periodically (every 100 requests)
    if (usageStats.totalRequests % 100 === 0) {
        cleanupOldEntries();
    }

    // Check rate limits
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
        usageStats.rateLimitHits++;
        
        console.log(`Rate limit exceeded for IP ${ip.substring(0, 8)}... (${rateLimitResult.period}: ${rateLimitResult.limit} requests)`);
        
        return { 
            statusCode: 429, 
            headers, 
            body: JSON.stringify({ 
                error: `Rate limit exceeded. Maximum ${rateLimitResult.limit} requests per ${rateLimitResult.period}.`,
                retryAfter: RATE_LIMITS[rateLimitResult.period].window / 1000
            }) 
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { prompt, conversation } = body;

        // Enhanced input validation
        if (!prompt || typeof prompt !== 'string') {
            logUsage(ip, userAgent, prompt, false);
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or missing prompt' }) };
        }
        
        if (prompt.length > 500) {
            logUsage(ip, userAgent, prompt, false);
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt too long (max 500 characters)' }) };
        }

        if (conversation && (
            !Array.isArray(conversation.past_user_inputs) ||
            !Array.isArray(conversation.generated_responses) ||
            conversation.past_user_inputs.length > 10 ||
            conversation.generated_responses.length > 10
        )) {
            logUsage(ip, userAgent, prompt, false);
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid conversation history' }) };
        }

        // Check API key
        const apiKey = process.env.HUGGINGFACE_API_KEY;
        if (!apiKey) {
            logUsage(ip, userAgent, prompt, false);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI service not configured' }) };
        }

        // Prepare HuggingFace payload
        const hfPayload = conversation
            ? {
                inputs: {
                    past_user_inputs: conversation.past_user_inputs || [],
                    generated_responses: conversation.generated_responses || [],
                    text: prompt
                }
            }
            : { inputs: prompt };

        // Call HuggingFace API
        const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(hfPayload)
        });

        const data = await response.json();
        
        if (data.error) {
            logUsage(ip, userAgent, prompt, false);
            console.log(`HuggingFace API error: ${data.error}`);
            return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service error' }) };
        }

        // Success
        logUsage(ip, userAgent, prompt, true);
        return { statusCode: 200, headers, body: JSON.stringify(data) };

    } catch (error) {
        logUsage(ip, userAgent, null, false);
        console.error('Function error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
