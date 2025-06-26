import { CommandResult } from '../../commands/Command.js';

export interface UpdateOperation {
  oldText: string;
  newText: string;
}

export interface FileMetadata {
  path: string;
  size: number;
  mode: number;
  modifiedTime: Date;
  createdTime: Date;
  accessedTime: Date;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
}

export interface IFileService {
  // Basic file operations
  readFile(path: string): Promise<CommandResult>;
  readFiles(paths: string[]): Promise<CommandResult>;
  writeFile(path: string, content: string, encoding?: BufferEncoding): Promise<CommandResult>;
  updateFile(path: string, updates: UpdateOperation[]): Promise<CommandResult>;
  moveFile(source: string, destination: string): Promise<CommandResult>;
  
  // Metadata operations
  getFileMetadata(path: string): Promise<CommandResult>;
  getDirectoryTree(dirPath: string, maxDepth?: number): Promise<CommandResult>;
  
  // Symlink operations
  createSymlink(target: string, linkPath: string): Promise<CommandResult>;
  
  // Comparison operations
  compareFiles(file1: string, file2: string): Promise<CommandResult>;
  findDuplicateFiles(directory: string): Promise<CommandResult>;
  diffFiles(file1: string, file2: string): Promise<CommandResult>;
  
  // Permission operations
  changePermissions(path: string, permissions: string, recursive?: boolean): Promise<CommandResult>;
}