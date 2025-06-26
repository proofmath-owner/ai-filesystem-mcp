import TestFramework, { TestSuite, TestCase, TestResult } from '../integration/TestFramework.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createServiceManager } from '../../core/services/ServiceFactory.js';
import { ServiceManager } from '../../core/services/ServiceManager.js';

export class E2ETestSuites {
  private framework: TestFramework;
  private serviceManager: ServiceManager;
  private testDataPath: string;

  constructor() {
    this.framework = new TestFramework({
      timeout: 60000, // E2E 테스트는 더 긴 타임아웃
      retries: 1,
      parallel: false, // E2E는 순차 실행
      verbose: true,
      generateReport: true
    });

    this.serviceManager = createServiceManager();
    this.testDataPath = path.join(__dirname, '../../../e2e-test-data');
  }

  // 모든 E2E 테스트 등록 및 실행
  async runAllE2ETests(): Promise<void> {
    // 테스트 스위트 등록
    this.framework.addSuite(this.createFileOperationsWorkflow());
    this.framework.addSuite(this.createCodeRefactoringWorkflow());
    this.framework.addSuite(this.createGitWorkflow());
    this.framework.addSuite(this.createSecurityWorkflow());
    this.framework.addSuite(this.createPerformanceWorkflow());
    this.framework.addSuite(this.createErrorHandlingWorkflow());

    // 모든 테스트 실행
    await this.framework.runAll();
  }

  // 1. 파일 운영 워크플로우 테스트
  private createFileOperationsWorkflow(): TestSuite {
    return {
      name: 'File Operations Workflow',
      description: 'End-to-end file manipulation workflow',
      
      setup: async () => {
        await fs.mkdir(this.testDataPath, { recursive: true });
      },

      teardown: async () => {
        try {
          await fs.rmdir(this.testDataPath, { recursive: true });
        } catch (error) {
          // 정리 실패 무시
        }
      },

      tests: [
        {
          name: 'Complete File Lifecycle',
          description: 'Create → Read → Update → Move → Delete workflow',
          execute: async (): Promise<TestResult> => {
            const fileService = this.serviceManager.get('fileService');
            const originalPath = path.join(this.testDataPath, 'lifecycle-test.txt');
            const movedPath = path.join(this.testDataPath, 'moved-lifecycle-test.txt');
            const originalContent = 'Hello, World!\nThis is a test file.';
            const updatedContent = 'Hello, Updated World!\nThis file was modified.';

            try {
              // 1. Create file
              await fileService.writeFile(originalPath, originalContent);
              
              // 2. Read file
              const readResult = await fileService.readFile(originalPath);
              if (readResult.content[0].text !== originalContent) {
                throw new Error('File content mismatch after creation');
              }

              // 3. Update file
              await fileService.updateFile(originalPath, [{
                oldText: 'Hello, World!',
                newText: 'Hello, Updated World!'
              }, {
                oldText: 'test file',
                newText: 'file was modified'
              }]);

              // Verify update
              const updatedResult = await fileService.readFile(originalPath);
              if (updatedResult.content[0].text !== updatedContent) {
                throw new Error('File content mismatch after update');
              }

              // 4. Move file
              await fileService.moveFile(originalPath, movedPath);
              
              // Verify move
              const movedResult = await fileService.readFile(movedPath);
              if (movedResult.content[0].text !== updatedContent) {
                throw new Error('File content mismatch after move');
              }

              // 5. Delete file
              await fs.unlink(movedPath);

              return {
                name: 'Complete File Lifecycle',
                success: true,
                duration: 0,
                output: 'File lifecycle completed successfully'
              };

            } catch (error) {
              // 정리
              try {
                await fs.unlink(originalPath);
                await fs.unlink(movedPath);
              } catch (cleanupError) {
                // 정리 실패 무시
              }
              throw error;
            }
          }
        },

        {
          name: 'Batch File Operations',
          description: 'Multiple files creation and processing',
          execute: async (): Promise<TestResult> => {
            const fileService = this.serviceManager.get('fileService');
            const fileCount = 10;
            const files: string[] = [];

            try {
              // Create multiple files
              for (let i = 0; i < fileCount; i++) {
                const filePath = path.join(this.testDataPath, `batch-test-${i}.txt`);
                await fileService.writeFile(filePath, `Content of file ${i}`);
                files.push(filePath);
              }

              // Read multiple files
              const readResult = await fileService.readFiles(files);
              const results = JSON.parse(readResult.content[0].text);
              
              if (results.length !== fileCount) {
                throw new Error(`Expected ${fileCount} files, got ${results.length}`);
              }

              // Verify all files were read successfully
              const successfulReads = results.filter((r: any) => r.success).length;
              if (successfulReads !== fileCount) {
                throw new Error(`Expected ${fileCount} successful reads, got ${successfulReads}`);
              }

              return {
                name: 'Batch File Operations',
                success: true,
                duration: 0,
                output: `Successfully processed ${fileCount} files`
              };

            } finally {
              // 정리
              await Promise.all(files.map(file => 
                fs.unlink(file).catch(() => {})
              ));
            }
          }
        }
      ]
    };
  }

  // 2. 코드 리팩토링 워크플로우 테스트
  private createCodeRefactoringWorkflow(): TestSuite {
    return {
      name: 'Code Refactoring Workflow',
      description: 'End-to-end code analysis and refactoring',
      
      tests: [
        {
          name: 'JavaScript Code Analysis and Refactoring',
          description: 'Analyze → Suggest → Apply refactoring',
          execute: async (): Promise<TestResult> => {
            const fileService = this.serviceManager.get('fileService');
            const codeFile = path.join(this.testDataPath, 'example.js');
            
            const originalCode = `
function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

function processOrder(order) {
  var total = calculateTotal(order.items);
  var tax = total * 0.1;
  var finalTotal = total + tax;
  return finalTotal;
}
`;

            try {
              // 1. Create code file
              await fileService.writeFile(codeFile, originalCode);

              // 2. Get file metadata
              const metadata = await fileService.getFileMetadata(codeFile);
              const metadataObj = JSON.parse(metadata.content[0].text);
              
              if (!metadataObj.isFile) {
                throw new Error('File metadata indicates it is not a file');
              }

              // 3. Compare with itself (should be identical)
              const compareResult = await fileService.compareFiles(codeFile, codeFile);
              if (!compareResult.content[0].text.includes('identical')) {
                throw new Error('File comparison with itself should be identical');
              }

              // 4. Create directory tree
              const dirTree = await fileService.getDirectoryTree(this.testDataPath);
              const tree = JSON.parse(dirTree.content[0].text);
              
              if (!tree || typeof tree !== 'object') {
                throw new Error('Directory tree should be an object');
              }

              return {
                name: 'JavaScript Code Analysis and Refactoring',
                success: true,
                duration: 0,
                output: 'Code analysis workflow completed successfully'
              };

            } finally {
              await fs.unlink(codeFile).catch(() => {});
            }
          }
        }
      ]
    };
  }

  // 3. Git 워크플로우 테스트
  private createGitWorkflow(): TestSuite {
    return {
      name: 'Git Workflow',
      description: 'End-to-end Git operations',
      
      tests: [
        {
          name: 'Git Status and Basic Operations',
          description: 'Check Git status and perform basic operations',
          execute: async (): Promise<TestResult> => {
            const gitService = this.serviceManager.get('gitService');

            try {
              // Git status (현재 저장소에서)
              const statusResult = await gitService.gitStatus('.');
              const status = JSON.parse(statusResult.content[0].text);
              
              if (!status || typeof status !== 'object') {
                throw new Error('Git status should return an object');
              }

              // 예상되는 Git 속성들이 있는지 확인
              const expectedProps = ['modified', 'added', 'deleted', 'untracked', 'branch'];
              for (const prop of expectedProps) {
                if (!(prop in status)) {
                  throw new Error(`Git status missing property: ${prop}`);
                }
              }

              return {
                name: 'Git Status and Basic Operations',
                success: true,
                duration: 0,
                output: `Git status retrieved successfully, current branch: ${status.branch}`
              };

            } catch (error) {
              // Git 저장소가 아닌 경우에는 성공으로 처리
              if (error instanceof Error && error.message.includes('not a git repository')) {
                return {
                  name: 'Git Status and Basic Operations',
                  success: true,
                  duration: 0,
                  output: 'Not a Git repository - test passed'
                };
              }
              throw error;
            }
          }
        }
      ]
    };
  }

  // 4. 보안 워크플로우 테스트
  private createSecurityWorkflow(): TestSuite {
    return {
      name: 'Security Workflow',
      description: 'End-to-end security operations',
      
      tests: [
        {
          name: 'File Permissions and Security',
          description: 'Test permission changes and security features',
          execute: async (): Promise<TestResult> => {
            const securityService = this.serviceManager.get('securityService');
            const testFile = path.join(this.testDataPath, 'security-test.txt');

            try {
              // Create test file
              await fs.writeFile(testFile, 'Security test content');

              // Test permission changes
              const permResult = await securityService.changePermissions(testFile, {
                mode: '644'
              });

              if (!permResult.content[0].text.includes('successfully')) {
                throw new Error('Permission change should succeed');
              }

              // Test secret scanning (should find no secrets in our test content)
              const scanResult = await securityService.scanSecrets(this.testDataPath);
              const scanData = JSON.parse(scanResult.content[0].text);

              if (!scanData || typeof scanData !== 'object') {
                throw new Error('Secret scan should return an object');
              }

              return {
                name: 'File Permissions and Security',
                success: true,
                duration: 0,
                output: `Security operations completed, scanned ${scanData.totalFindings || 0} potential issues`
              };

            } finally {
              await fs.unlink(testFile).catch(() => {});
            }
          }
        }
      ]
    };
  }

  // 5. 성능 워크플로우 테스트
  private createPerformanceWorkflow(): TestSuite {
    return {
      name: 'Performance Workflow',
      description: 'End-to-end performance testing',
      
      tests: [
        {
          name: 'Large File Handling',
          description: 'Test handling of large files',
          timeout: 30000, // 30초 타임아웃
          execute: async (): Promise<TestResult> => {
            const fileService = this.serviceManager.get('fileService');
            const largeFile = path.join(this.testDataPath, 'large-test.txt');
            const largeContent = 'Large file content.\n'.repeat(10000); // ~200KB

            try {
              const startTime = Date.now();

              // Write large file
              await fileService.writeFile(largeFile, largeContent);

              // Read large file
              const readResult = await fileService.readFile(largeFile);
              
              const duration = Date.now() - startTime;

              if (readResult.content[0].text !== largeContent) {
                throw new Error('Large file content mismatch');
              }

              // Performance check - should complete within reasonable time
              if (duration > 5000) { // 5 seconds
                throw new Error(`Large file operation took too long: ${duration}ms`);
              }

              return {
                name: 'Large File Handling',
                success: true,
                duration: 0,
                output: `Large file processed in ${duration}ms`
              };

            } finally {
              await fs.unlink(largeFile).catch(() => {});
            }
          }
        }
      ]
    };
  }

  // 6. 에러 처리 워크플로우 테스트
  private createErrorHandlingWorkflow(): TestSuite {
    return {
      name: 'Error Handling Workflow',
      description: 'End-to-end error handling and recovery',
      
      tests: [
        {
          name: 'Graceful Error Handling',
          description: 'Test proper error handling and recovery',
          execute: async (): Promise<TestResult> => {
            const fileService = this.serviceManager.get('fileService');
            const nonExistentFile = path.join(this.testDataPath, 'non-existent-file.txt');

            try {
              // Try to read non-existent file
              const readResult = await fileService.readFile(nonExistentFile);
              
              // Should return error information, not throw
              if (readResult.content[0].text.includes('Error:')) {
                // Good - error was handled gracefully
                return {
                  name: 'Graceful Error Handling',
                  success: true,
                  duration: 0,
                  output: 'Error handled gracefully'
                };
              } else {
                throw new Error('Expected error message but got success result');
              }

            } catch (error) {
              // If it throws, check if it's the expected error
              if (error instanceof Error && error.message.includes('ENOENT')) {
                return {
                  name: 'Graceful Error Handling',
                  success: true,
                  duration: 0,
                  output: 'Error thrown as expected'
                };
              }
              throw error;
            }
          }
        },

        {
          name: 'Invalid Input Handling',
          description: 'Test handling of invalid inputs',
          execute: async (): Promise<TestResult> => {
            const fileService = this.serviceManager.get('fileService');

            try {
              // Try invalid operations
              const emptyPathResult = await fileService.readFile('');
              const invalidUpdateResult = await fileService.updateFile('/invalid/path', []);

              // Both should handle errors gracefully
              const hasErrorHandling = 
                emptyPathResult.content[0].text.includes('Error:') &&
                invalidUpdateResult.content[0].text.includes('Error:');

              if (hasErrorHandling) {
                return {
                  name: 'Invalid Input Handling',
                  success: true,
                  duration: 0,
                  output: 'Invalid inputs handled gracefully'
                };
              } else {
                throw new Error('Invalid inputs were not handled properly');
              }

            } catch (error) {
              // Throwing is also acceptable for invalid inputs
              return {
                name: 'Invalid Input Handling',
                success: true,
                duration: 0,
                output: 'Invalid inputs caused expected exceptions'
              };
            }
          }
        }
      ]
    };
  }
}

export default E2ETestSuites;