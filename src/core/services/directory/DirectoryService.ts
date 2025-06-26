import { IDirectoryService } from '../../interfaces/IDirectoryService.js';
import { DirectoryOperations } from './DirectoryOperations.js';
import { MonitoringManager } from '../../managers/MonitoringManager.js';

export class DirectoryService implements IDirectoryService {
  constructor(
    private dirOps: DirectoryOperations,
    private monitor: MonitoringManager
  ) {}

  async createDirectory(path: string, options?: { recursive?: boolean }): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dirOps.createDirectory(path, options);
      this.monitor.trackOperation('directory', 'create', Date.now() - startTime);
    } catch (error) {
      this.monitor.trackError('directory', 'create', error as Error);
      throw error;
    }
  }

  async removeDirectory(path: string, options?: { recursive?: boolean }): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dirOps.removeDirectory(path, options);
      this.monitor.trackOperation('directory', 'remove', Date.now() - startTime);
    } catch (error) {
      this.monitor.trackError('directory', 'remove', error as Error);
      throw error;
    }
  }

  async listDirectory(path: string, options?: { detailed?: boolean; pattern?: string }): Promise<any[]> {
    const startTime = Date.now();
    try {
      const results = await this.dirOps.listDirectory(path, options);
      this.monitor.trackOperation('directory', 'list', Date.now() - startTime);
      return results;
    } catch (error) {
      this.monitor.trackError('directory', 'list', error as Error);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.dirOps.exists(path);
  }

  async getStats(path: string): Promise<any> {
    return this.dirOps.getStats(path);
  }

  async copyDirectory(source: string, destination: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dirOps.copyDirectory(source, destination);
      this.monitor.trackOperation('directory', 'copy', Date.now() - startTime);
    } catch (error) {
      this.monitor.trackError('directory', 'copy', error as Error);
      throw error;
    }
  }

  async moveDirectory(source: string, destination: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dirOps.moveDirectory(source, destination);
      this.monitor.trackOperation('directory', 'move', Date.now() - startTime);
    } catch (error) {
      this.monitor.trackError('directory', 'move', error as Error);
      throw error;
    }
  }
}
