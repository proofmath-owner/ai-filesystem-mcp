const { performance } = require('perf_hooks');

async function testPerformance() {
    // Test old system
    const oldStart = performance.now();
    const { FileSystemManager } = require('../dist/core/FileSystemManager.js');
    const oldManager = new FileSystemManager();
    const oldEnd = performance.now();
    
    // Test new system
    const newStart = performance.now();
    const { ServiceContainer } = require('../dist/core/ServiceContainer.js');
    const newContainer = new ServiceContainer();
    const newEnd = performance.now();
    
    const oldTime = oldEnd - oldStart;
    const newTime = newEnd - newStart;
    
    console.log(`Old system initialization: ${oldTime.toFixed(2)}ms`);
    console.log(`New system initialization: ${newTime.toFixed(2)}ms`);
    console.log(`Difference: ${(newTime - oldTime).toFixed(2)}ms (${((newTime/oldTime - 1) * 100).toFixed(1)}%)`);
    
    if (newTime > oldTime * 2) {
        throw new Error('New system is significantly slower than old system');
    }
}

testPerformance().catch(console.error);
