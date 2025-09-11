# WebAR Wave Physics + AI Assistant

A real-time WebAR application that combines hand gesture recognition, realistic physics simulation, and AI-powered voice interaction. Create and manipulate 3D waves through hand gestures while chatting with an intelligent physics assistant.

## Features

### 🌊 Interactive Wave Physics
- **Gesture Control**: Create waves using pinch gestures (thumb + index finger)
- **Dribble Mechanics**: Control existing waves by bringing index and middle fingers together
- **Realistic Physics**: Full collision detection with momentum conservation, gravity, and friction
- **Visual Effects**: 3D wave animations with collision sparks and boundary bounces

### 🤖 AI Assistant
- **Natural Language**: Ask questions about physics, wave mechanics, and simulation controls
- **Voice Synthesis**: AI responses are spoken aloud with text-to-speech
- **Quick Commands**: One-click actions for common tasks (create waves, clear simulation, show stats)
- **Physics Explanations**: Get detailed explanations of how the simulation works

### 📱 Cross-Platform WebAR
- **Camera Integration**: Uses device camera for hand tracking
- **MediaPipe Hands**: Advanced hand landmark detection and gesture recognition
- **Mobile Optimized**: Works on iOS and Android browsers
- **Fallback Support**: Click/tap to create waves when camera isn't available

## Live Demo

🔗 **[https://animation0910202501c.netlify.app/](https://animation0910202501c.netlify.app/)**

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas, CSS3
- **Hand Tracking**: MediaPipe Hands
- **Physics Engine**: Custom real-time collision detection
- **AI Integration**: Hugging Face Inference API (DialoGPT)
- **Backend**: Netlify Functions (serverless)
- **Speech**: Web Speech API (Speech Synthesis)
- **Deployment**: Netlify

## Getting Started

### Prerequisites
- Node.js 18+
- Netlify CLI (optional, for local development)
- Hugging Face account with API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd webar-physics-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file or set in Netlify dashboard
   HUGGINGFACE_API_KEY=your_hugging_face_api_key_here
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Deploy to Netlify**
   - Connect your repository to Netlify
   - Set the environment variable in Netlify dashboard
   - Deploy automatically on push

### Local Development

```bash
# Run with Netlify Dev (recommended)
npm run dev

# Or serve the built files
npm run serve
```

## Usage

### Hand Gestures

**Creating Waves (Pinching)**
1. Show your hand to the camera
2. Bring thumb and index finger together (pinch)
3. Hold the pinch to size the wave
4. Release to create a physics-enabled wave

**Controlling Waves (Dribbling)**
1. Bring index and middle fingers together near an existing wave
2. The wave will be attracted to your hand position
3. Move your hand to guide the wave's movement

### AI Assistant

**Voice Commands**
- "Create a wave"
- "Clear all waves" 
- "How do collisions work?"
- "Show physics statistics"
- "Spawn test waves"

**Quick Command Buttons**
- **Create**: Add a new wave at screen center
- **Test**: Spawn 5 waves for collision testing
- **Clear**: Remove all waves from simulation
- **Stats**: Toggle physics statistics panel
- **How It Works**: Explain the physics engine
- **What You Do**: Learn about AI capabilities

## Architecture

### Security
- **API Key Protection**: Hugging Face API key stored securely in Netlify environment variables
- **Proxy Pattern**: Frontend calls Netlify function, which proxies requests to Hugging Face
- **Rate Limiting**: Multi-tier protection (10/min, 50/hour, 200/day per IP)
- **Input Validation**: Sanitized prompts and conversation history

### Physics Engine
- **Collision Detection**: Circle-based collision with momentum conservation
- **Forces**: Gravity, friction, elastic bouncing, and user-applied forces
- **Performance**: 60fps simulation with efficient spatial calculations
- **Visual Feedback**: Real-time collision sparks and wave deformation

### AI Integration
```
Frontend → /.netlify/functions/ai-proxy → Hugging Face API
         (public requests)              (secured with API key)
```

## File Structure

```
├── index.html              # Main application file
├── build.js               # Build script
├── package.json           # Dependencies and scripts
├── netlify.toml          # Netlify configuration
├── .netlify/functions/
│   └── ai-proxy.js       # Serverless AI proxy function
└── dist/                 # Built files (auto-generated)
    └── index.html
```

## Configuration

### Rate Limiting
Modify in `ai-proxy.js`:
```javascript
const RATE_LIMITS = {
    minute: { max: 10, window: 60 * 1000 },
    hour: { max: 50, window: 60 * 60 * 1000 },
    day: { max: 200, window: 24 * 60 * 60 * 1000 }
};
```

### Physics Parameters
Adjust in the `PhysicsEngine` class:
```javascript
this.gravity = 0.1;           // Gravitational force
this.friction = 0.98;         // Movement damping
this.bounceDamping = 0.7;     // Wall bounce energy loss
this.collisionRadius = 0.8;   // Collision sensitivity
```

## Monitoring

### Usage Statistics
Access real-time stats: `https://your-site.netlify.app/.netlify/functions/ai-proxy/stats`

### Function Logs
```bash
# View Netlify function logs
netlify logs:functions --name=ai-proxy
```

### Key Metrics
- Total API requests
- Unique users (IPs)
- Error rates
- Rate limit hits
- Requests per hour

## API Limits

**Hugging Face Free Tier**
- Rate-limited API access
- Daily/monthly quotas
- No billing - service stops when quota exceeded
- Resets automatically

**Built-in Protection**
- Conservative rate limiting prevents quota burnout
- Smart request queuing
- Graceful degradation when limits hit

## Browser Support

- **Chrome/Edge**: Full support with camera access
- **Safari (iOS)**: Full support with camera permission
- **Firefox**: MediaPipe support varies
- **Fallback**: Click/tap wave creation when camera unavailable

## Security Considerations

- API keys never exposed to client-side code
- CORS properly configured for Netlify functions
- Input validation and sanitization
- Rate limiting prevents abuse
- No sensitive data stored client-side

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile and desktop
5. Submit a pull request

## Known Issues

- MediaPipe may have loading delays on slow connections
- Hand tracking accuracy varies with lighting conditions
- Speech synthesis voice availability depends on device/browser

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify camera permissions are granted
3. Test with different lighting conditions
4. Check Netlify function logs for API issues

---

**Built with ❤️ using WebAR, AI, and real-time physics simulation**
