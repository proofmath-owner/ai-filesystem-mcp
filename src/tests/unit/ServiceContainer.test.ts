import { ServiceContainer } from '../../core/ServiceContainer';
import { FileService } from '../../core/services/file/FileService';
import { SearchService } from '../../core/services/search/SearchService';
import { GitService } from '../../core/services/git/GitService';
import { SecurityService } from '../../core/services/security/SecurityService';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  afterEach(async () => {
    await container.dispose();
  });

  describe('Service Registration', () => {
    it('should register a service', () => {
      const service = new FileService();
      container.register('fileService', service);
      
      const retrieved = container.getService<FileService>('fileService');
      expect(retrieved).toBe(service);
    });

    it('should register multiple services', () => {
      const fileService = new FileService();
      const searchService = new SearchService();
      
      container.register('fileService', fileService);
      container.register('searchService', searchService);
      
      expect(container.getService('fileService')).toBe(fileService);
      expect(container.getService('searchService')).toBe(searchService);
    });

    it('should throw error when registering duplicate service', () => {
      const service1 = new FileService();
      const service2 = new FileService();
      
      container.register('fileService', service1);
      
      expect(() => {
        container.register('fileService', service2);
      }).toThrow('Service fileService is already registered');
    });
  });

  describe('Service Retrieval', () => {
    it('should return registered service', () => {
      const service = new FileService();
      container.register('fileService', service);
      
      const retrieved = container.getService<FileService>('fileService');
      expect(retrieved).toBe(service);
    });

    it('should throw error for unregistered service', () => {
      expect(() => {
        container.getService('nonexistent');
      }).toThrow('Service nonexistent not found');
    });

    it('should return undefined with tryGetService for unregistered service', () => {
      const service = container.tryGetService('nonexistent');
      expect(service).toBeUndefined();
    });

    it('should return service with tryGetService for registered service', () => {
      const service = new FileService();
      container.register('fileService', service);
      
      const retrieved = container.tryGetService<FileService>('fileService');
      expect(retrieved).toBe(service);
    });
  });

  describe('Service Management', () => {
    it('should check if service is registered', () => {
      expect(container.hasService('fileService')).toBe(false);
      
      const service = new FileService();
      container.register('fileService', service);
      
      expect(container.hasService('fileService')).toBe(true);
    });

    it('should unregister service', async () => {
      const service = new FileService();
      container.register('fileService', service);
      
      expect(container.hasService('fileService')).toBe(true);
      
      await container.unregister('fileService');
      
      expect(container.hasService('fileService')).toBe(false);
    });

    it('should not throw when unregistering non-existent service', async () => {
      await expect(container.unregister('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('Service Initialization', () => {
    it('should initialize all core services', async () => {
      await container.initialize();
      
      expect(container.hasService('fileService')).toBe(true);
      expect(container.hasService('directoryService')).toBe(true);
      expect(container.hasService('searchService')).toBe(true);
      expect(container.hasService('gitService')).toBe(true);
      expect(container.hasService('securityService')).toBe(true);
      expect(container.hasService('codeService')).toBe(true);
      expect(container.hasService('monitoringService')).toBe(true);
    });

    it('should initialize services only once', async () => {
      await container.initialize();
      const fileService1 = container.getService('fileService');
      
      await container.initialize();
      const fileService2 = container.getService('fileService');
      
      expect(fileService1).toBe(fileService2);
    });
  });

  describe('Service Disposal', () => {
    it('should dispose all services', async () => {
      await container.initialize();
      
      const fileService = container.getService<FileService>('fileService');
      const disposeSpy = jest.spyOn(fileService, 'dispose');
      
      await container.dispose();
      
      expect(disposeSpy).toHaveBeenCalled();
      expect(container.hasService('fileService')).toBe(false);
    });

    it('should handle disposal of services without dispose method', async () => {
      const simpleService = { name: 'simple' };
      container.register('simpleService', simpleService);
      
      await expect(container.dispose()).resolves.not.toThrow();
    });
  });

  describe('Service List', () => {
    it('should return list of registered service names', () => {
      expect(container.getServiceNames()).toEqual([]);
      
      container.register('fileService', new FileService());
      container.register('searchService', new SearchService());
      
      const names = container.getServiceNames();
      expect(names).toContain('fileService');
      expect(names).toContain('searchService');
      expect(names).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', async () => {
      const failingService = {
        initialize: jest.fn().mockRejectedValue(new Error('Init failed'))
      };
      
      container.register('failingService', failingService);
      
      await expect(container.initialize()).rejects.toThrow('Init failed');
    });

    it('should handle service disposal errors gracefully', async () => {
      const failingService = {
        dispose: jest.fn().mockRejectedValue(new Error('Dispose failed'))
      };
      
      container.register('failingService', failingService);
      
      // Should not throw even if service disposal fails
      await expect(container.dispose()).resolves.not.toThrow();
    });
  });
});