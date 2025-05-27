import { Command } from './Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class CommandRegistry {
  private commands = new Map<string, Command>();

  /**
   * 명령어 등록
   */
  register(command: Command): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Command '${command.name}' is already registered`);
    }
    this.commands.set(command.name, command);
  }

  /**
   * 여러 명령어 한번에 등록
   */
  registerMany(commands: Command[]): void {
    commands.forEach(cmd => this.register(cmd));
  }

  /**
   * 명령어 가져오기
   */
  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * 명령어 존재 확인
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * 모든 도구 정보 가져오기
   */
  getAllTools(): Tool[] {
    return Array.from(this.commands.values()).map(cmd => cmd.toTool());
  }

  /**
   * 명령어 실행
   */
  async execute(name: string, context: any): Promise<any> {
    const command = this.get(name);
    if (!command) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return command.execute(context);
  }

  /**
   * 등록된 명령어 개수
   */
  get size(): number {
    return this.commands.size;
  }

  /**
   * 모든 명령어 이름
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }
}
