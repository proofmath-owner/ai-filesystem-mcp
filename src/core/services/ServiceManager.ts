import { IFileService } from './interfaces/IFileService.js';
import { ISearchService } from './interfaces/ISearchService.js';
import { IGitService } from './interfaces/IGitService.js';
import { ISecurityService } from './interfaces/ISecurityService.js';

export interface ServiceInstances {
  fileService: IFileService;
  searchService: ISearchService;
  gitService: IGitService;
  securityService: ISecurityService;
}

export class ServiceManager {
  private services: Map<string, any> = new Map();
  
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }
  
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }
  
  getAll(): ServiceInstances {
    return {
      fileService: this.get<IFileService>('fileService'),
      searchService: this.get<ISearchService>('searchService'),
      gitService: this.get<IGitService>('gitService'),
      securityService: this.get<ISecurityService>('securityService'),
    };
  }
  
  has(name: string): boolean {
    return this.services.has(name);
  }
  
  clear(): void {
    this.services.clear();
  }
}