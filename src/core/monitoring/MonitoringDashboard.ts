import { MonitoringManager } from '../managers/MonitoringManager.js';
import * as readline from 'readline';

export class MonitoringDashboard {
  private monitoring: MonitoringManager;
  private updateInterval: any = null;
  private isRunning = false;
  private enableLogging: boolean;

  constructor(monitoring: MonitoringManager) {
    this.monitoring = monitoring;
    // Only enable detailed logging in development or when explicitly requested
    this.enableLogging = process.env.NODE_ENV === 'development' || process.env.MCP_ENABLE_DASHBOARD_LOGS === 'true';
  }

  start(): void {
    this.isRunning = true;
    this.clearScreen();
    
    // Update dashboard every second
    this.updateInterval = setInterval(() => {
      if (this.isRunning) {
        this.render();
      }
    }, 1000);

    // Handle keyboard input
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    process.stdin.on('keypress', (str, key) => {
      if (key && key.name === 'q') {
        this.stop();
      }
    });
  }

  stop(): void {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    
    this.clearScreen();
    console.log('Monitoring stopped.');
    process.exit(0);
  }

  private clearScreen(): void {
    console.clear();
  }

  private render(): void {
    // Skip rendering if logging is disabled
    if (!this.enableLogging) {
      return;
    }
    
    this.clearScreen();
    
    const stats = this.monitoring.getStats();
    const timestamp = new Date().toLocaleString();
    
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║           AI FileSystem MCP - Real-time Monitoring             ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Time: ${timestamp.padEnd(57)}║`);
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║                         OPERATIONS                             ║');
    console.log('╠────────────────────────────────────────────────────────────────╣');
    
    // Display operation stats
    const categories = ['file', 'directory', 'git', 'search', 'code', 'security'];
    
    for (const category of categories) {
      const categoryStats = stats.operations[category] || {
        total: 0,
        successful: 0,
        failed: 0,
        averageTime: 0
      };
      
      const successRate = categoryStats.total > 0 
        ? ((categoryStats.successful / categoryStats.total) * 100).toFixed(1)
        : '0.0';
      
      console.log(`║ ${category.padEnd(12)} │ Total: ${String(categoryStats.total).padEnd(6)} │ Success: ${successRate.padEnd(5)}% │ Avg: ${categoryStats.averageTime.toFixed(0).padEnd(4)}ms ║`);
    }
    
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║                          ERRORS                                ║');
    console.log('╠────────────────────────────────────────────────────────────────╣');
    
    // Display recent errors
    const recentErrors = stats.errors.slice(-5);
    if (recentErrors.length === 0) {
      console.log('║ No recent errors                                               ║');
    } else {
      for (const error of recentErrors) {
        const errorLine = `${error.category}/${error.operation}: ${error.error.message}`;
        const truncated = errorLine.length > 60 ? errorLine.substring(0, 57) + '...' : errorLine;
        console.log(`║ ${truncated.padEnd(63)}║`);
      }
    }
    
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║                      PERFORMANCE                               ║');
    console.log('╠────────────────────────────────────────────────────────────────╣');
    
    // Calculate overall metrics
    let totalOps = 0;
    let totalTime = 0;
    let totalSuccess = 0;
    
    for (const category of Object.values(stats.operations) as any[]) {
      totalOps += category.total;
      totalSuccess += category.successful;
      totalTime += category.averageTime * category.total;
    }
    
    const overallAvg = totalOps > 0 ? (totalTime / totalOps).toFixed(0) : '0';
    const overallSuccess = totalOps > 0 ? ((totalSuccess / totalOps) * 100).toFixed(1) : '0.0';
    
    console.log(`║ Total Operations: ${String(totalOps).padEnd(45)}║`);
    console.log(`║ Overall Success Rate: ${overallSuccess.padEnd(41)}% ║`);
    console.log(`║ Average Response Time: ${overallAvg.padEnd(40)}ms ║`);
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║ Press "q" to quit                                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
  }
}

// Standalone monitoring script
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ServiceContainer } = await import('../ServiceContainer.js');
  const container = new ServiceContainer();
  const monitoring = container.getService<MonitoringManager>('monitoringManager');
  
  const dashboard = new MonitoringDashboard(monitoring);
  dashboard.start();
}
