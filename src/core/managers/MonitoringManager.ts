export interface OperationMetrics {
  total: number;
  successful: number;
  failed: number;
  totalTime: number;
  averageTime: number;
}

export interface ErrorRecord {
  timestamp: Date;
  category: string;
  operation: string;
  error: Error;
}

export class MonitoringManager {
  private operations: Map<string, Map<string, OperationMetrics>> = new Map();
  private errors: ErrorRecord[] = [];
  private maxErrors = 1000;

  trackOperation(category: string, operation: string, duration: number): void {
    if (!this.operations.has(category)) {
      this.operations.set(category, new Map());
    }
    
    const categoryOps = this.operations.get(category)!;
    if (!categoryOps.has(operation)) {
      categoryOps.set(operation, {
        total: 0,
        successful: 0,
        failed: 0,
        totalTime: 0,
        averageTime: 0
      });
    }
    
    const metrics = categoryOps.get(operation)!;
    metrics.total++;
    metrics.successful++;
    metrics.totalTime += duration;
    metrics.averageTime = metrics.totalTime / metrics.total;
  }

  trackError(category: string, operation: string, error: Error): void {
    // Update operation metrics
    if (this.operations.has(category)) {
      const categoryOps = this.operations.get(category)!;
      if (categoryOps.has(operation)) {
        const metrics = categoryOps.get(operation)!;
        metrics.total++;
        metrics.failed++;
      }
    }

    // Store error record
    this.errors.push({
      timestamp: new Date(),
      category,
      operation,
      error
    });

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  getStats(): any {
    const stats: any = {
      operations: {},
      errors: this.errors
    };

    for (const [category, operations] of this.operations) {
      stats.operations[category] = {
        total: 0,
        successful: 0,
        failed: 0,
        averageTime: 0
      };

      for (const metrics of operations.values()) {
        stats.operations[category].total += metrics.total;
        stats.operations[category].successful += metrics.successful;
        stats.operations[category].failed += metrics.failed;
        stats.operations[category].averageTime += metrics.averageTime;
      }

      // Calculate weighted average
      if (stats.operations[category].total > 0) {
        stats.operations[category].averageTime /= operations.size;
      }
    }

    return stats;
  }

  destroy(): void {
    this.operations.clear();
    this.errors = [];
  }
}
