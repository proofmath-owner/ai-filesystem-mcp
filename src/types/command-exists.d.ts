declare module 'command-exists' {
  export function commandExists(command: string): Promise<string>;
  export function commandExistsSync(command: string): boolean;
}
