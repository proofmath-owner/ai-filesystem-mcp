const { ServiceContainer } = require('../dist/core/ServiceContainer.js');

async function testCompatibility() {
    const container = new ServiceContainer();
    const registry = container.getCommandRegistry();
    
    // Test a few key commands exist
    const criticalCommands = [
        'read_file', 'write_file', 'update_file',
        'list_directory', 'create_directory',
        'git_status', 'git_commit',
        'search_files', 'analyze_code'
    ];
    
    for (const cmdName of criticalCommands) {
        if (!registry.has(cmdName)) {
            throw new Error(`Critical command missing: ${cmdName}`);
        }
    }
    
    console.log('All critical commands are available');
}

testCompatibility().catch(console.error);
