const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'dist', 'index-new.js');
const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
    output += data.toString();
});

server.stderr.on('data', (data) => {
    errorOutput += data.toString();
    
    // Check if server started successfully
    if (errorOutput.includes('AI FileSystem MCP Server v3.0 Started')) {
        console.log('Server started successfully!');
        server.kill('SIGTERM');
    }
});

// Timeout after 5 seconds
setTimeout(() => {
    console.error('Server startup timeout');
    server.kill('SIGTERM');
    process.exit(1);
}, 5000);

server.on('close', (code) => {
    if (code !== 0 && code !== null) {
        console.error('Server exited with error code:', code);
        console.error('Error output:', errorOutput);
        process.exit(1);
    }
    process.exit(0);
});
