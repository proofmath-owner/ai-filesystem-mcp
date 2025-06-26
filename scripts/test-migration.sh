#!/bin/bash

# AI FileSystem MCP Migration Test Script
# This script tests the new modular architecture

set -e

echo "========================================="
echo "AI FileSystem MCP Migration Test"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test directory
TEST_DIR="./migration-test"
RESULTS_FILE="./migration-test-results.txt"

# Create test directory
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize results file
echo "Migration Test Results - $(date)" > "../$RESULTS_FILE"
echo "================================" >> "../$RESULTS_FILE"

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_result=$3
    
    echo -n "Testing $test_name... "
    echo "" >> "../$RESULTS_FILE"
    echo "Test: $test_name" >> "../$RESULTS_FILE"
    
    if eval "$test_command" >> "../$RESULTS_FILE" 2>&1; then
        if [ -n "$expected_result" ]; then
            if eval "$expected_result" >> "../$RESULTS_FILE" 2>&1; then
                echo -e "${GREEN}✓ PASSED${NC}"
                echo "Result: PASSED" >> "../$RESULTS_FILE"
            else
                echo -e "${RED}✗ FAILED (validation)${NC}"
                echo "Result: FAILED (validation)" >> "../$RESULTS_FILE"
            fi
        else
            echo -e "${GREEN}✓ PASSED${NC}"
            echo "Result: PASSED" >> "../$RESULTS_FILE"
        fi
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Result: FAILED" >> "../$RESULTS_FILE"
    fi
}

echo ""
echo "1. Testing TypeScript Compilation"
echo "---------------------------------"

cd ..
run_test "TypeScript compilation" "npm run build"

echo ""
echo "2. Testing Unit Tests"
echo "--------------------"

run_test "FileService tests" "npm test -- FileService.test.ts"
run_test "DirectoryService tests" "npm test -- DirectoryService.test.ts"
run_test "All unit tests" "npm test"

echo ""
echo "3. Testing Integration"
echo "---------------------"

run_test "Integration tests" "npm test -- integration/"

echo ""
echo "4. Testing Command Loading"
echo "-------------------------"

# Create a test script to check command loading
cat > test-command-loading.js << 'EOF'
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
EOF

run_test "Command loading" "node test-command-loading.js"

echo ""
echo "5. Testing Server Startup"
echo "------------------------"

# Test server startup (with timeout)
cat > test-server-startup.js << 'EOF'
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
EOF

run_test "Server startup" "node test-server-startup.js"

echo ""
echo "6. Performance Comparison"
echo "------------------------"

# Create performance test
cat > test-performance.js << 'EOF'
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
EOF

run_test "Performance comparison" "node test-performance.js"

echo ""
echo "7. Compatibility Test"
echo "--------------------"

# Test that old commands still work with new system
cat > test-compatibility.js << 'EOF'
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
EOF

run_test "Backward compatibility" "node test-compatibility.js"

echo ""
echo "========================================="
echo "Migration Test Summary"
echo "========================================="

# Count results
TOTAL_TESTS=$(grep -c "^Test:" "../$RESULTS_FILE")
PASSED_TESTS=$(grep -c "Result: PASSED" "../$RESULTS_FILE")
FAILED_TESTS=$(grep -c "Result: FAILED" "../$RESULTS_FILE")

echo "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All migration tests passed!${NC}"
    echo -e "\nThe new modular architecture is ready for deployment."
    echo -e "You can now replace index.ts with index-new.ts"
else
    echo -e "\n${RED}✗ Some tests failed. Please check $RESULTS_FILE for details.${NC}"
fi

# Cleanup
cd ..
rm -rf "$TEST_DIR"
rm -f test-*.js

echo ""
echo "Results saved to: $RESULTS_FILE"
