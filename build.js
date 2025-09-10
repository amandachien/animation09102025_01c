const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log('Created dist directory');
}

// Just copy index.html as-is (no API key injection)
let html = fs.readFileSync('index.html', 'utf8');
fs.writeFileSync(path.join(distDir, 'index.html'), html);
console.log('Build completed: index.html copied to dist/');

// Verify the file was created
if (fs.existsSync(path.join(distDir, 'index.html'))) {
    console.log('✅ Build successful - index.html exists in dist/');
} else {
    console.error('❌ Build failed - index.html not found in dist/');
    process.exit(1);
}
