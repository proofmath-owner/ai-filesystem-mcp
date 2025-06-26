import { ExecuteShellCommand } from '../../../src/commands/implementations/security/ExecuteShellCommand.js';
import { ServiceContainer } from '../../../src/core/ServiceContainer.js';

describe('ExecuteShellCommand', () => {
  let command: ExecuteShellCommand;
  let container: ServiceContainer;

  beforeEach(async () => {
    command = new ExecuteShellCommand();
    container = new ServiceContainer();
    await container.initialize();
  });

  afterEach(async () => {
    await container.cleanup();
  });

  describe('validation', () => {
    it('should validate required command parameter', async () => {
      const result = await command.execute({
        args: {},
        container
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('command must be a string');
    });

    it('should validate args array', async () => {
      const result = await command.execute({
        args: {
          command: 'echo',
          args: 'not-an-array'
        },
        container
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('args must be an array');
    });

    it('should validate timeout is positive', async () => {
      const result = await command.execute({
        args: {
          command: 'echo',
          timeout: -1000
        },
        container
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout must be a positive number');
    });
  });

  describe('security', () => {
    it('should block dangerous commands', async () => {
      const dangerousCommands = ['rm', 'sudo', 'shutdown', 'dd'];

      for (const cmd of dangerousCommands) {
        const result = await command.execute({
          args: { command: cmd },
          container
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('blocked');
      }
    });

    it('should block command injection attempts', async () => {
      const injectionAttempts = [
        'echo test; rm -rf /',
        'echo test | rm -rf /',
        'echo test && rm -rf /',
        'echo `rm -rf /`',
        'echo $(rm -rf /)'
      ];

      for (const cmd of injectionAttempts) {
        const result = await command.execute({
          args: { command: cmd },
          container
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Security validation failed');
      }
    });

    it('should sanitize control characters', async () => {
      const result = await command.execute({
        args: {
          command: 'echo',
          args: ['test\x00\x1F']
        },
        container
      });

      expect(result.success).toBe(true);
      expect(result.data.stdout).not.toContain('\x00');
      expect(result.data.stdout).not.toContain('\x1F');
    });
  });

  describe('execution', () => {
    it('should execute simple commands', async () => {
      const result = await command.execute({
        args: {
          command: 'echo',
          args: ['Hello, World!']
        },
        container
      });

      expect(result.success).toBe(true);
      expect(result.data.stdout.trim()).toBe('Hello, World!');
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle command not found', async () => {
      const result = await command.execute({
        args: {
          command: 'nonexistentcommand123'
        },
        container
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Command not found');
    });

    it('should handle timeout', async () => {
      const result = await command.execute({
        args: {
          command: 'sleep',
          args: ['5'],
          timeout: 100
        },
        container
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should capture stderr', async () => {
      const result = await command.execute({
        args: {
          command: 'ls',
          args: ['/nonexistent/directory']
        },
        container
      });

      expect(result.success).toBe(false);
      expect(result.data.stderr).toBeTruthy();
      expect(result.data.exitCode).not.toBe(0);
    });

    it('should support environment variables', async () => {
      const result = await command.execute({
        args: {
          command: process.platform === 'win32' ? 'echo' : 'printenv',
          args: process.platform === 'win32' ? ['%TEST_VAR%'] : ['TEST_VAR'],
          env: { TEST_VAR: 'test_value' },
          shell: process.platform === 'win32'
        },
        container
      });

      expect(result.success).toBe(true);
      expect(result.data.stdout).toContain('test_value');
    });

    it('should support working directory', async () => {
      const result = await command.execute({
        args: {
          command: 'pwd',
          cwd: '/tmp'
        },
        container
      });

      if (process.platform !== 'win32') {
        expect(result.success).toBe(true);
        expect(result.data.stdout.trim()).toBe('/tmp');
      }
    });
  });

  describe('output formatting', () => {
    it('should include execution time', async () => {
      const result = await command.execute({
        args: {
          command: 'echo',
          args: ['test']
        },
        container
      });

      expect(result.success).toBe(true);
      expect(result.data.executionTime).toBeGreaterThan(0);
    });

    it('should include full command in result', async () => {
      const result = await command.execute({
        args: {
          command: 'echo',
          args: ['arg1', 'arg2']
        },
        container
      });

      expect(result.success).toBe(true);
      expect(result.data.command).toBe('echo arg1 arg2');
    });
  });
});
