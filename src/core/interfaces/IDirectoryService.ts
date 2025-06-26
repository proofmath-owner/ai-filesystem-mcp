export interface IDirectoryService {
  createDirectory(path: string, options?: { recursive?: boolean }): Promise<void>;
  removeDirectory(path: string, options?: { recursive?: boolean }): Promise<void>;
  listDirectory(path: string, options?: { detailed?: boolean; pattern?: string }): Promise<any[]>;
  exists(path: string): Promise<boolean>;
  getStats(path: string): Promise<any>;
  copyDirectory(source: string, destination: string): Promise<void>;
  moveDirectory(source: string, destination: string): Promise<void>;
}
