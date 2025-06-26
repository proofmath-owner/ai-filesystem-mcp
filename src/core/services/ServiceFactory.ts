import { ServiceManager } from './ServiceManager.js';
import { FileService } from './impl/FileService.js';
import { SearchService } from './impl/SearchService.js';
import { GitService } from './impl/GitService.js';
import { SecurityService } from './impl/SecurityService.js';
import { CacheManager } from '../CacheManager.js';
import { FileUtils } from '../FileUtils.js';
import { DiffManager } from '../DiffManager.js';
import { MonitoringManager } from '../MonitoringManager.js';
import { ErrorHandlingManager } from '../ErrorHandlingManager.js';
import { GitIntegration } from '../GitIntegration.js';
import { SecurityManager } from '../SecurityManager.js';
import { PermissionManager } from '../PermissionManager.js';
import { AdvancedSearchManager } from '../AdvancedSearchManager.js';

export function createServiceManager(): ServiceManager {
  const serviceManager = new ServiceManager();
  
  // Initialize shared dependencies
  const cacheManager = new CacheManager();
  const fileUtils = new FileUtils();
  const diffManager = new DiffManager();
  const monitoringManager = new MonitoringManager();
  const errorManager = new ErrorHandlingManager();
  const gitIntegration = new GitIntegration();
  const securityManager = new SecurityManager();
  const permissionManager = new PermissionManager();
  const searchManager = new AdvancedSearchManager();
  
  // Initialize services
  const fileService = new FileService(
    cacheManager,
    fileUtils,
    diffManager,
    monitoringManager,
    errorManager
  );
  
  const searchService = new SearchService(
    searchManager,
    monitoringManager,
    errorManager
  );
  
  const gitService = new GitService(
    monitoringManager,
    errorManager
  );
  
  const securityService = new SecurityService(
    securityManager,
    permissionManager,
    monitoringManager,
    errorManager
  );
  
  // Register services
  serviceManager.register('fileService', fileService);
  serviceManager.register('searchService', searchService);
  serviceManager.register('gitService', gitService);
  serviceManager.register('securityService', securityService);
  
  return serviceManager;
}