const { ServiceContainer } = require('../dist/core/ServiceContainer.js');

async function testCommandLoading() {
    const container = new ServiceContainer();
    const registry = container.getCommandRegistry();
    const summary = registry.getSummary();
    
    console.log('Commands loaded:', summary.total);
    console.log('By category:', summary.byCategory);
    
    // Check minimum expected commands
    const minExpected = 40;
    if (summary.total < minExpected) {
        throw new Error(`Expected at least ${minExpected} commands, got ${summary.total}`);
    }
    
    // Check all categories have commands
    const expectedCategories = ['file', 'directory', 'git', 'search', 'code', 'security'];
    for (const category of expectedCategories) {
        if (!summary.byCategory[category] || summary.byCategory[category] === 0) {
            throw new Error(`No commands found for category: ${category}`);
        }
    }
    
    console.log('Command loading test passed!');
}

testCommandLoading().catch(console.error);
