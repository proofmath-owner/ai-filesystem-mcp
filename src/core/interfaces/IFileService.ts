export interface IFileService {
  readFile(path: string): Promise<string>;
  readFiles(paths: string[]): Promise<Array<{ path: string; content?: string; error?: string }>>;
  writeFile(path: string, content: string): Promise<void>;
  updateFile(path: string, updates: Array<{ oldText: string; newText: string }>): Promise<void>;
  moveFile(source: string, destination: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getStats(path: string): Promise<any>;
}
