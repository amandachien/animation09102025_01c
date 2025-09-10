const fetch = require('node-fetch');

// Optional: Simple in-memory rate limiting (per function instance, not global)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30;
let requestCounts = {};

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    // Basic rate limiting by IP (not perfect, but helps)
    const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
    const now = Date.now();
    requestCounts[ip] = (requestCounts[ip] || []).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (requestCounts[ip].length >= RATE_LIMIT_MAX) {
        return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests. Please slow down.' }) };
    }
    requestCounts[ip].push(now);

    try {
        const body = JSON.parse(event.body || '{}');
        const { prompt, conversation } = body;

        // Input validation
        if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or missing prompt' }) };
        }
        if (conversation && (
            !Array.isArray(conversation.past_user_inputs) ||
            !Array.isArray(conversation.generated_responses) ||
            conversation.past_user_inputs.length > 10 ||
            conversation.generated_responses.length > 10
        )) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid conversation history' }) };
        }

        const apiKey = process.env.HUGGINGFACE_API_KEY;
        if (!apiKey) {
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
            return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service error' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(data) };

    } catch (error) {
        // Do not leak internal errors
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
