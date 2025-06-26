export interface ShellExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
  timedOut?: boolean;
  executionTime: number;
  command: string;
}

export interface ShellExecutionOptions {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean;
  encoding?: BufferEncoding;
}

export interface SecurityPolicy {
  allowedCommands?: string[];
  blockedCommands: string[];
  blockedPatterns: RegExp[];
  maxCommandLength: number;
  allowShell: boolean;
}

export interface IShellService {
  executeCommand(
    command: string,
    options?: ShellExecutionOptions
  ): Promise<ShellExecutionResult>;
  
  validateCommand(command: string, args?: string[]): Promise<boolean>;
  
  setSecurityPolicy(policy: Partial<SecurityPolicy>): void;
  
  getSecurityPolicy(): SecurityPolicy;
}
