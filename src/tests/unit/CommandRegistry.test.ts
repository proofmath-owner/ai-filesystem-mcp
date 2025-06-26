import { CommandRegistry } from '../../core/commands/CommandRegistry.js';
import { Command, CommandContext, CommandResult } from '../../core/commands/Command.js';

// Mock Command for testing
class TestCommand extends Command {
  readonly name = 'test_command';
  readonly description = 'Test command';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      value: { type: 'string' as const }
    },
    required: ['value']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.value, 'value');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    return {
      content: [{ type: 'text', text: `Test: ${context.args.value}` }]
    };
  }
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('should register a command successfully', () => {
      const command = new TestCommand();
      
      expect(() => registry.register(command)).not.toThrow();
      expect(registry.has('test_command')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should throw error when registering duplicate command', () => {
      const command1 = new TestCommand();
      const command2 = new TestCommand();
      
      registry.register(command1);
      
      expect(() => registry.register(command2)).toThrow(
        "Command 'test_command' is already registered"
      );
    });
  });

  describe('registerMany', () => {
    it('should register multiple commands at once', () => {
      const commands = [
        new TestCommand(),
      ];
      
      registry.registerMany(commands);
      
      expect(registry.size).toBe(1);
      expect(registry.has('test_command')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return registered command', () => {
      const command = new TestCommand();
      registry.register(command);
      
      const retrieved = registry.get('test_command');
      
      expect(retrieved).toBe(command);
    });

    it('should return undefined for non-existent command', () => {
      const retrieved = registry.get('non_existent');
      
      expect(retrieved).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should execute command successfully', async () => {
      const command = new TestCommand();
      registry.register(command);
      
      const result = await registry.execute('test_command', {
        args: { value: 'hello' },
        fsManager: {}
      });
      
      expect(result.content[0].text).toBe('Test: hello');
    });

    it('should throw error for unknown command', async () => {
      await expect(
        registry.execute('unknown', { args: {}, fsManager: {} })
      ).rejects.toThrow('Unknown tool: unknown');
    });
  });

  describe('getAllTools', () => {
    it('should return all registered tools', () => {
      const command = new TestCommand();
      registry.register(command);
      
      const tools = registry.getAllTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_command');
      expect(tools[0].description).toBe('Test command');
    });
  });

  describe('getCommandNames', () => {
    it('should return all command names', () => {
      const command = new TestCommand();
      registry.register(command);
      
      const names = registry.getCommandNames();
      
      expect(names).toEqual(['test_command']);
    });
  });
});