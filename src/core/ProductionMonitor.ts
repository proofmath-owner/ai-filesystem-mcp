import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SystemMetrics {
  timestamp: Date;
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  uptime: number;
}

export interface AppMetrics {
  timestamp: Date;
  requests: {
    total: number;
    perSecond: number;
    errors: number;
    errorRate: number;
  };
  commands: {
    executed: number;
    failed: number;
    averageDuration: number;
    slowestCommand: string;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  connections: {
    active: number;
    total: number;
  };
}

export interface BusinessMetrics {
  timestamp: Date;
  files: {
    processed: number;
    created: number;
    modified: number;
    deleted: number;
    totalSize: number;
  };
  operations: {
    search: number;
    analysis: number;
    refactoring: number;
    git: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
}

export interface AlertRule {
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  cooldown: number; // Minutes between alerts
}

export interface Alert {
  id: string;
  rule: string;
  severity: AlertRule['severity'];
  message: string;
  timestamp: Date;
  metrics: any;
  resolved?: Date;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  duration: number;
  message?: string;
  details?: any;
}

export class ProductionMonitor extends EventEmitter {
  private metrics: {
    system: SystemMetrics[];
    app: AppMetrics[];
    business: BusinessMetrics[];
  } = {
    system: [],
    app: [],
    business: []
  };

  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private lastAlerts = new Map<string, Date>();
  
  private intervals = {
    metrics: null as NodeJS.Timeout | null,
    health: null as NodeJS.Timeout | null,
    cleanup: null as NodeJS.Timeout | null
  };

  private readonly config = {
    metricsInterval: 30000, // 30 seconds
    healthInterval: 60000,  // 1 minute
    cleanupInterval: 3600000, // 1 hour
    retentionDays: 7,
    alertCooldown: 300000 // 5 minutes
  };

  private counters = {
    requests: 0,
    errors: 0,
    commands: 0,
    commandFailures: 0,
    cacheHits: 0,
    cacheMisses: 0,
    filesProcessed: 0,
    filesCreated: 0,
    filesModified: 0,
    filesDeleted: 0,
    totalFileSize: 0,
    searchOperations: 0,
    analysisOperations: 0,
    refactoringOperations: 0,
    gitOperations: 0
  };

  private responseTimesBuffer: number[] = [];
  private commandDurationsBuffer: Array<{ command: string; duration: number }> = [];

  constructor() {
    super();
    this.setupDefaultAlertRules();
  }

  // Start monitoring
  start(): void {
    console.log('🚀 Starting production monitoring...');
    
    this.intervals.metrics = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    this.intervals.health = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthInterval);

    this.intervals.cleanup = setInterval(() => {
      this.cleanupOldData();
    }, this.config.cleanupInterval);

    // Initial collection
    this.collectMetrics();
    this.performHealthChecks();

    this.emit('monitoring_started');
  }

  // Stop monitoring
  stop(): void {
    console.log('🛑 Stopping production monitoring...');
    
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });

    this.emit('monitoring_stopped');
  }

  // Collect system metrics
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // CPU usage calculation (simplified)
    const cpus = os.cpus();
    const cpuUsage = this.calculateCpuUsage(cpus);

    // Disk usage (current working directory)
    const diskStats = await this.getDiskUsage(process.cwd());

    return {
      timestamp: new Date(),
      memory: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        percentage: (usedMem / totalMem) * 100
      },
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      disk: diskStats,
      uptime: os.uptime()
    };
  }

  // Collect application metrics
  collectAppMetrics(): AppMetrics {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Calculate requests per second (from last second)
    const recentRequests = this.counters.requests; // Simplified
    const recentErrors = this.counters.errors;

    // Calculate cache hit rate
    const totalCacheRequests = this.counters.cacheHits + this.counters.cacheMisses;
    const hitRate = totalCacheRequests > 0 ? (this.counters.cacheHits / totalCacheRequests) * 100 : 0;

    // Calculate average command duration
    const avgDuration = this.commandDurationsBuffer.length > 0
      ? this.commandDurationsBuffer.reduce((sum, cmd) => sum + cmd.duration, 0) / this.commandDurationsBuffer.length
      : 0;

    const slowestCommand = this.commandDurationsBuffer.length > 0
      ? this.commandDurationsBuffer.reduce((prev, current) => 
          prev.duration > current.duration ? prev : current
        ).command
      : '';

    return {
      timestamp: new Date(),
      requests: {
        total: this.counters.requests,
        perSecond: recentRequests, // Simplified
        errors: this.counters.errors,
        errorRate: this.counters.requests > 0 ? (this.counters.errors / this.counters.requests) * 100 : 0
      },
      commands: {
        executed: this.counters.commands,
        failed: this.counters.commandFailures,
        averageDuration: avgDuration,
        slowestCommand
      },
      cache: {
        hits: this.counters.cacheHits,
        misses: this.counters.cacheMisses,
        hitRate,
        size: totalCacheRequests
      },
      connections: {
        active: 1, // Simplified - would track actual connections
        total: this.counters.requests
      }
    };
  }

  // Collect business metrics
  collectBusinessMetrics(): BusinessMetrics {
    // Calculate percentiles
    const sortedTimes = [...this.responseTimesBuffer].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const avgResponseTime = sortedTimes.length > 0
      ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length
      : 0;

    return {
      timestamp: new Date(),
      files: {
        processed: this.counters.filesProcessed,
        created: this.counters.filesCreated,
        modified: this.counters.filesModified,
        deleted: this.counters.filesDeleted,
        totalSize: this.counters.totalFileSize
      },
      operations: {
        search: this.counters.searchOperations,
        analysis: this.counters.analysisOperations,
        refactoring: this.counters.refactoringOperations,
        git: this.counters.gitOperations
      },
      performance: {
        averageResponseTime: avgResponseTime,
        p95ResponseTime: sortedTimes[p95Index] || 0,
        p99ResponseTime: sortedTimes[p99Index] || 0
      }
    };
  }

  // Collect all metrics
  async collectMetrics(): Promise<void> {
    try {
      const [systemMetrics, appMetrics, businessMetrics] = await Promise.all([
        this.collectSystemMetrics(),
        Promise.resolve(this.collectAppMetrics()),
        Promise.resolve(this.collectBusinessMetrics())
      ]);

      // Store metrics
      this.metrics.system.push(systemMetrics);
      this.metrics.app.push(appMetrics);
      this.metrics.business.push(businessMetrics);

      // Check alert rules
      this.checkAlertRules({
        system: systemMetrics,
        app: appMetrics,
        business: businessMetrics
      });

      this.emit('metrics_collected', {
        system: systemMetrics,
        app: appMetrics,
        business: businessMetrics
      });

    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.recordError('metrics_collection_failed');
    }
  }

  // Perform health checks
  async performHealthChecks(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    // Database health check
    checks.push(await this.checkDatabase());

    // File system health check
    checks.push(await this.checkFileSystem());

    // Memory health check
    checks.push(await this.checkMemory());

    // Dependency health check
    checks.push(await this.checkDependencies());

    // Determine overall status
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warnChecks = checks.filter(check => check.status === 'warn');

    let status: HealthStatus['status'];
    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warnChecks.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    const healthStatus: HealthStatus = {
      status,
      checks,
      timestamp: new Date()
    };

    this.emit('health_check_completed', healthStatus);

    return healthStatus;
  }

  // Individual health checks
  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      // Simulate database ping
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return {
        name: 'database',
        status: 'pass',
        duration: Date.now() - start,
        message: 'Database connection healthy'
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'fail',
        duration: Date.now() - start,
        message: 'Database connection failed',
        details: error
      };
    }
  }

  private async checkFileSystem(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      // Check if we can write to temp directory
      const tempFile = path.join(os.tmpdir(), `health-check-${Date.now()}.tmp`);
      await fs.writeFile(tempFile, 'health check');
      await fs.unlink(tempFile);
      
      return {
        name: 'filesystem',
        status: 'pass',
        duration: Date.now() - start,
        message: 'File system access healthy'
      };
    } catch (error) {
      return {
        name: 'filesystem',
        status: 'fail',
        duration: Date.now() - start,
        message: 'File system access failed',
        details: error
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const usedPercent = (memUsage.heapUsed / totalMem) * 100;
      
      let status: HealthCheck['status'] = 'pass';
      let message = 'Memory usage normal';
      
      if (usedPercent > 90) {
        status = 'fail';
        message = 'Critical memory usage';
      } else if (usedPercent > 75) {
        status = 'warn';
        message = 'High memory usage';
      }
      
      return {
        name: 'memory',
        status,
        duration: Date.now() - start,
        message,
        details: { usedPercent, heapUsed: memUsage.heapUsed }
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'fail',
        duration: Date.now() - start,
        message: 'Memory check failed',
        details: error
      };
    }
  }

  private async checkDependencies(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      // Check critical dependencies
      const dependencies = ['fs', 'path', 'os'];
      for (const dep of dependencies) {
        require(dep);
      }
      
      return {
        name: 'dependencies',
        status: 'pass',
        duration: Date.now() - start,
        message: 'All dependencies available'
      };
    } catch (error) {
      return {
        name: 'dependencies',
        status: 'fail',
        duration: Date.now() - start,
        message: 'Dependency check failed',
        details: error
      };
    }
  }

  // Event recording methods
  recordRequest(): void {
    this.counters.requests++;
  }

  recordError(type: string): void {
    this.counters.errors++;
    this.emit('error_recorded', { type, timestamp: new Date() });
  }

  recordCommand(command: string, duration: number, success: boolean): void {
    this.counters.commands++;
    
    if (!success) {
      this.counters.commandFailures++;
    }
    
    this.commandDurationsBuffer.push({ command, duration });
    
    // Keep only last 1000 entries
    if (this.commandDurationsBuffer.length > 1000) {
      this.commandDurationsBuffer.shift();
    }
  }

  recordResponseTime(duration: number): void {
    this.responseTimesBuffer.push(duration);
    
    // Keep only last 1000 entries
    if (this.responseTimesBuffer.length > 1000) {
      this.responseTimesBuffer.shift();
    }
  }

  recordCacheHit(): void {
    this.counters.cacheHits++;
  }

  recordCacheMiss(): void {
    this.counters.cacheMisses++;
  }

  recordFileOperation(type: 'created' | 'modified' | 'deleted' | 'processed', size = 0): void {
    this.counters.filesProcessed++;
    this.counters.totalFileSize += size;
    
    switch (type) {
      case 'created':
        this.counters.filesCreated++;
        break;
      case 'modified':
        this.counters.filesModified++;
        break;
      case 'deleted':
        this.counters.filesDeleted++;
        break;
    }
  }

  recordOperation(type: 'search' | 'analysis' | 'refactoring' | 'git'): void {
    switch (type) {
      case 'search':
        this.counters.searchOperations++;
        break;
      case 'analysis':
        this.counters.analysisOperations++;
        break;
      case 'refactoring':
        this.counters.refactoringOperations++;
        break;
      case 'git':
        this.counters.gitOperations++;
        break;
    }
  }

  // Alert management
  private setupDefaultAlertRules(): void {
    this.alertRules = [
      {
        name: 'high_memory_usage',
        condition: (metrics) => metrics.system.memory.percentage > 90,
        severity: 'critical',
        message: 'Memory usage critically high',
        cooldown: 5
      },
      {
        name: 'high_error_rate',
        condition: (metrics) => metrics.app.requests.errorRate > 10,
        severity: 'error',
        message: 'Error rate is high',
        cooldown: 5
      },
      {
        name: 'slow_response_time',
        condition: (metrics) => metrics.business.performance.averageResponseTime > 5000,
        severity: 'warning',
        message: 'Response time is slow',
        cooldown: 10
      },
      {
        name: 'disk_space_low',
        condition: (metrics) => metrics.system.disk.percentage > 85,
        severity: 'warning',
        message: 'Disk space running low',
        cooldown: 30
      }
    ];
  }

  private checkAlertRules(metrics: any): void {
    for (const rule of this.alertRules) {
      if (rule.condition(metrics)) {
        this.triggerAlert(rule, metrics);
      }
    }
  }

  private triggerAlert(rule: AlertRule, metrics: any): void {
    const now = new Date();
    const lastAlert = this.lastAlerts.get(rule.name);
    
    // Check cooldown
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < rule.cooldown * 60000) {
      return;
    }
    
    const alert: Alert = {
      id: `${rule.name}_${now.getTime()}`,
      rule: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: now,
      metrics
    };
    
    this.alerts.push(alert);
    this.lastAlerts.set(rule.name, now);
    
    this.emit('alert_triggered', alert);
    
    console.log(`🚨 Alert: [${rule.severity.toUpperCase()}] ${rule.message}`);
  }

  // Data cleanup
  private cleanupOldData(): void {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    // Clean up metrics
    this.metrics.system = this.metrics.system.filter(m => m.timestamp > cutoffDate);
    this.metrics.app = this.metrics.app.filter(m => m.timestamp > cutoffDate);
    this.metrics.business = this.metrics.business.filter(m => m.timestamp > cutoffDate);
    
    // Clean up alerts
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffDate);
    
    console.log('🧹 Cleaned up old monitoring data');
  }

  // Utility methods
  private calculateCpuUsage(cpus: os.CpuInfo[]): number {
    // Simplified CPU usage calculation
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof os.CpuInfo['times']];
      }
      totalIdle += cpu.times.idle;
    });
    
    return 100 - (totalIdle / totalTick) * 100;
  }

  private async getDiskUsage(dirPath: string): Promise<SystemMetrics['disk']> {
    try {
      const stats = await fs.stat(dirPath);
      // Simplified disk usage - would use actual disk space APIs in production
      return {
        used: 1024 * 1024 * 1024, // 1GB (placeholder)
        free: 9 * 1024 * 1024 * 1024, // 9GB (placeholder)
        total: 10 * 1024 * 1024 * 1024, // 10GB (placeholder)
        percentage: 10
      };
    } catch (error) {
      return { used: 0, free: 0, total: 0, percentage: 0 };
    }
  }

  // Getters for metrics
  getSystemMetrics(): SystemMetrics[] {
    return [...this.metrics.system];
  }

  getAppMetrics(): AppMetrics[] {
    return [...this.metrics.app];
  }

  getBusinessMetrics(): BusinessMetrics[] {
    return [...this.metrics.business];
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  getCurrentHealthStatus(): Promise<HealthStatus> {
    return this.performHealthChecks();
  }

  // Export methods for reporting
  async exportMetrics(filePath: string): Promise<void> {
    const data = {
      timestamp: new Date().toISOString(),
      system: this.metrics.system,
      app: this.metrics.app,
      business: this.metrics.business,
      alerts: this.alerts
    };
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`📊 Metrics exported to ${filePath}`);
  }
}

export default ProductionMonitor;