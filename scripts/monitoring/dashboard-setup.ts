#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';

export interface DashboardConfig {
  grafana: {
    url: string;
    apiKey: string;
    organizationId: number;
  };
  prometheus: {
    url: string;
    datasourceName: string;
  };
  dashboards: DashboardDefinition[];
}

export interface DashboardDefinition {
  id: string;
  title: string;
  description: string;
  panels: PanelDefinition[];
  refreshInterval: string;
  timeRange: string;
}

export interface PanelDefinition {
  id: number;
  title: string;
  type: 'graph' | 'singlestat' | 'table' | 'heatmap';
  query: string;
  yAxis?: {
    unit: string;
    min?: number;
    max?: number;
  };
  thresholds?: Array<{
    value: number;
    color: string;
    op: 'gt' | 'lt';
  }>;
}

export class DashboardSetup {
  private config: DashboardConfig;

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      grafana: {
        url: config.grafana?.url || 'http://localhost:3001',
        apiKey: config.grafana?.apiKey || process.env.GRAFANA_API_KEY || '',
        organizationId: config.grafana?.organizationId || 1
      },
      prometheus: {
        url: config.prometheus?.url || 'http://localhost:9090',
        datasourceName: config.prometheus?.datasourceName || 'Prometheus'
      },
      dashboards: config.dashboards || this.getDefaultDashboards()
    };
  }

  // Generate default dashboard definitions
  private getDefaultDashboards(): DashboardDefinition[] {
    return [
      {
        id: 'mcp-overview',
        title: 'AI FileSystem MCP - Overview',
        description: 'High-level overview of system health and performance',
        refreshInterval: '5s',
        timeRange: 'now-1h',
        panels: [
          {
            id: 1,
            title: 'Request Rate',
            type: 'graph',
            query: 'rate(mcp_requests_total[5m])',
            yAxis: { unit: 'reqps', min: 0 }
          },
          {
            id: 2,
            title: 'Error Rate',
            type: 'graph',
            query: 'rate(mcp_errors_total[5m])',
            yAxis: { unit: 'percent', min: 0, max: 100 },
            thresholds: [
              { value: 1, color: 'yellow', op: 'gt' },
              { value: 5, color: 'red', op: 'gt' }
            ]
          },
          {
            id: 3,
            title: 'Response Time (95th percentile)',
            type: 'graph',
            query: 'histogram_quantile(0.95, rate(mcp_response_time_seconds_bucket[5m]))',
            yAxis: { unit: 'ms', min: 0 },
            thresholds: [
              { value: 1000, color: 'yellow', op: 'gt' },
              { value: 5000, color: 'red', op: 'gt' }
            ]
          },
          {
            id: 4,
            title: 'Active Commands',
            type: 'singlestat',
            query: 'mcp_active_commands'
          },
          {
            id: 5,
            title: 'Memory Usage',
            type: 'graph',
            query: 'process_resident_memory_bytes / 1024 / 1024',
            yAxis: { unit: 'MB', min: 0 }
          },
          {
            id: 6,
            title: 'CPU Usage',
            type: 'graph',
            query: 'rate(process_cpu_seconds_total[5m]) * 100',
            yAxis: { unit: 'percent', min: 0, max: 100 }
          }
        ]
      },
      {
        id: 'mcp-commands',
        title: 'AI FileSystem MCP - Commands',
        description: 'Detailed command execution metrics',
        refreshInterval: '10s',
        timeRange: 'now-6h',
        panels: [
          {
            id: 1,
            title: 'Commands per Second',
            type: 'graph',
            query: 'rate(mcp_command_executions_total[5m])'
          },
          {
            id: 2,
            title: 'Command Success Rate',
            type: 'graph',
            query: 'rate(mcp_command_successes_total[5m]) / rate(mcp_command_executions_total[5m]) * 100',
            yAxis: { unit: 'percent', min: 0, max: 100 }
          },
          {
            id: 3,
            title: 'Command Duration by Type',
            type: 'graph',
            query: 'histogram_quantile(0.95, rate(mcp_command_duration_seconds_bucket[5m])) by (command_type)'
          },
          {
            id: 4,
            title: 'Most Used Commands',
            type: 'table',
            query: 'topk(10, sum by (command) (increase(mcp_command_executions_total[1h])))'
          },
          {
            id: 5,
            title: 'Failed Commands',
            type: 'table',
            query: 'topk(10, sum by (command, error_type) (increase(mcp_command_failures_total[1h])))'
          },
          {
            id: 6,
            title: 'Command Queue Size',
            type: 'graph',
            query: 'mcp_command_queue_size'
          }
        ]
      },
      {
        id: 'mcp-performance',
        title: 'AI FileSystem MCP - Performance',
        description: 'Performance metrics and resource utilization',
        refreshInterval: '15s',
        timeRange: 'now-24h',
        panels: [
          {
            id: 1,
            title: 'File Operations Rate',
            type: 'graph',
            query: 'rate(mcp_file_operations_total[5m]) by (operation_type)'
          },
          {
            id: 2,
            title: 'Cache Hit Rate',
            type: 'graph',
            query: 'rate(mcp_cache_hits_total[5m]) / (rate(mcp_cache_hits_total[5m]) + rate(mcp_cache_misses_total[5m])) * 100',
            yAxis: { unit: 'percent', min: 0, max: 100 }
          },
          {
            id: 3,
            title: 'File System I/O',
            type: 'graph',
            query: 'rate(mcp_fs_io_bytes_total[5m]) by (direction)'
          },
          {
            id: 4,
            title: 'Search Operations',
            type: 'graph',
            query: 'rate(mcp_search_operations_total[5m]) by (search_type)'
          },
          {
            id: 5,
            title: 'Git Operations',
            type: 'graph',
            query: 'rate(mcp_git_operations_total[5m]) by (git_command)'
          },
          {
            id: 6,
            title: 'Response Time Heatmap',
            type: 'heatmap',
            query: 'sum(rate(mcp_response_time_seconds_bucket[5m])) by (le)'
          }
        ]
      },
      {
        id: 'mcp-security',
        title: 'AI FileSystem MCP - Security',
        description: 'Security events and monitoring',
        refreshInterval: '30s',
        timeRange: 'now-7d',
        panels: [
          {
            id: 1,
            title: 'Security Events',
            type: 'graph',
            query: 'rate(mcp_security_events_total[5m]) by (event_type)'
          },
          {
            id: 2,
            title: 'Failed Authentication Attempts',
            type: 'graph',
            query: 'rate(mcp_auth_failures_total[5m])',
            thresholds: [
              { value: 5, color: 'yellow', op: 'gt' },
              { value: 20, color: 'red', op: 'gt' }
            ]
          },
          {
            id: 3,
            title: 'Path Traversal Attempts',
            type: 'singlestat',
            query: 'increase(mcp_path_traversal_attempts_total[24h])'
          },
          {
            id: 4,
            title: 'Shell Command Blocks',
            type: 'graph',
            query: 'rate(mcp_shell_command_blocks_total[5m])'
          },
          {
            id: 5,
            title: 'File Permission Violations',
            type: 'table',
            query: 'topk(10, sum by (path, user) (increase(mcp_permission_violations_total[1h])))'
          },
          {
            id: 6,
            title: 'Security Level Distribution',
            type: 'graph',
            query: 'mcp_security_level by (level)'
          }
        ]
      }
    ];
  }

  // Generate Grafana dashboard JSON
  generateGrafanaDashboard(definition: DashboardDefinition): any {
    return {
      dashboard: {
        id: null,
        title: definition.title,
        description: definition.description,
        tags: ['mcp', 'filesystem', 'monitoring'],
        timezone: 'browser',
        refresh: definition.refreshInterval,
        time: {
          from: definition.timeRange.split('-')[0],
          to: definition.timeRange.includes('now') ? 'now' : definition.timeRange.split('-')[1]
        },
        panels: definition.panels.map((panel, index) => ({
          id: panel.id,
          title: panel.title,
          type: panel.type,
          gridPos: {
            h: 8,
            w: 12,
            x: (index % 2) * 12,
            y: Math.floor(index / 2) * 8
          },
          targets: [
            {
              expr: panel.query,
              refId: 'A',
              datasource: this.config.prometheus.datasourceName
            }
          ],
          yAxes: panel.yAxis ? [
            {
              unit: panel.yAxis.unit,
              min: panel.yAxis.min,
              max: panel.yAxis.max
            }
          ] : undefined,
          thresholds: panel.thresholds ? {
            steps: panel.thresholds.map(t => ({
              color: t.color,
              value: t.value
            }))
          } : undefined
        })),
        templating: {
          list: [
            {
              name: 'instance',
              type: 'query',
              query: 'label_values(mcp_info, instance)',
              datasource: this.config.prometheus.datasourceName,
              includeAll: true,
              allValue: '.*'
            }
          ]
        }
      },
      overwrite: true,
      inputs: [
        {
          name: 'DS_PROMETHEUS',
          type: 'datasource',
          pluginId: 'prometheus',
          value: this.config.prometheus.datasourceName
        }
      ]
    };
  }

  // Generate Prometheus configuration
  generatePrometheusConfig(): any {
    return {
      global: {
        scrape_interval: '15s',
        evaluation_interval: '15s'
      },
      rule_files: [
        'mcp-rules.yml'
      ],
      scrape_configs: [
        {
          job_name: 'mcp-server',
          static_configs: [
            {
              targets: ['localhost:3000']
            }
          ],
          metrics_path: '/metrics',
          scrape_interval: '5s'
        },
        {
          job_name: 'node-exporter',
          static_configs: [
            {
              targets: ['localhost:9100']
            }
          ]
        }
      ],
      alerting: {
        alertmanagers: [
          {
            static_configs: [
              {
                targets: ['localhost:9093']
              }
            ]
          }
        ]
      }
    };
  }

  // Generate Prometheus alerting rules
  generateAlertingRules(): any {
    return {
      groups: [
        {
          name: 'mcp-alerts',
          rules: [
            {
              alert: 'MCPHighErrorRate',
              expr: 'rate(mcp_errors_total[5m]) > 0.1',
              for: '2m',
              labels: {
                severity: 'critical'
              },
              annotations: {
                summary: 'MCP error rate is high',
                description: 'Error rate is {{ $value }} errors per second'
              }
            },
            {
              alert: 'MCPHighResponseTime',
              expr: 'histogram_quantile(0.95, rate(mcp_response_time_seconds_bucket[5m])) > 5',
              for: '5m',
              labels: {
                severity: 'warning'
              },
              annotations: {
                summary: 'MCP response time is high',
                description: '95th percentile response time is {{ $value }}s'
              }
            },
            {
              alert: 'MCPHighMemoryUsage',
              expr: 'process_resident_memory_bytes / 1024 / 1024 / 1024 > 2',
              for: '10m',
              labels: {
                severity: 'warning'
              },
              annotations: {
                summary: 'MCP memory usage is high',
                description: 'Memory usage is {{ $value }}GB'
              }
            },
            {
              alert: 'MCPServiceDown',
              expr: 'up{job="mcp-server"} == 0',
              for: '30s',
              labels: {
                severity: 'critical'
              },
              annotations: {
                summary: 'MCP service is down',
                description: 'MCP server is not responding'
              }
            },
            {
              alert: 'MCPSecurityIncident',
              expr: 'rate(mcp_security_events_total[5m]) > 0.1',
              for: '1m',
              labels: {
                severity: 'critical'
              },
              annotations: {
                summary: 'Security incident detected',
                description: 'Security events rate: {{ $value }} events per second'
              }
            }
          ]
        }
      ]
    };
  }

  // Generate Docker Compose for monitoring stack
  generateDockerCompose(): any {
    return {
      version: '3.8',
      services: {
        prometheus: {
          image: 'prom/prometheus:latest',
          container_name: 'mcp-prometheus',
          ports: ['9090:9090'],
          volumes: [
            './monitoring/prometheus.yml:/etc/prometheus/prometheus.yml',
            './monitoring/rules.yml:/etc/prometheus/rules.yml',
            'prometheus-data:/prometheus'
          ],
          command: [
            '--config.file=/etc/prometheus/prometheus.yml',
            '--storage.tsdb.path=/prometheus',
            '--web.console.libraries=/etc/prometheus/console_libraries',
            '--web.console.templates=/etc/prometheus/consoles',
            '--storage.tsdb.retention.time=200h',
            '--web.enable-lifecycle'
          ],
          restart: 'unless-stopped'
        },
        grafana: {
          image: 'grafana/grafana:latest',
          container_name: 'mcp-grafana',
          ports: ['3001:3000'],
          environment: [
            'GF_SECURITY_ADMIN_PASSWORD=admin123',
            'GF_USERS_ALLOW_SIGN_UP=false'
          ],
          volumes: [
            'grafana-data:/var/lib/grafana',
            './monitoring/grafana/provisioning:/etc/grafana/provisioning'
          ],
          restart: 'unless-stopped'
        },
        alertmanager: {
          image: 'prom/alertmanager:latest',
          container_name: 'mcp-alertmanager',
          ports: ['9093:9093'],
          volumes: [
            './monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml'
          ],
          restart: 'unless-stopped'
        },
        'node-exporter': {
          image: 'prom/node-exporter:latest',
          container_name: 'mcp-node-exporter',
          ports: ['9100:9100'],
          volumes: [
            '/proc:/host/proc:ro',
            '/sys:/host/sys:ro',
            '/:/rootfs:ro'
          ],
          command: [
            '--path.procfs=/host/proc',
            '--path.rootfs=/rootfs',
            '--path.sysfs=/host/sys',
            '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
          ],
          restart: 'unless-stopped'
        }
      },
      volumes: {
        'prometheus-data': null,
        'grafana-data': null
      }
    };
  }

  // Setup monitoring stack
  async setupMonitoring(outputDir = './monitoring'): Promise<void> {
    console.log('🔧 Setting up monitoring stack...');
    
    // Create directories
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(`${outputDir}/grafana/provisioning/dashboards`, { recursive: true });
    await fs.mkdir(`${outputDir}/grafana/provisioning/datasources`, { recursive: true });

    // Generate Prometheus config
    const prometheusConfig = this.generatePrometheusConfig();
    await fs.writeFile(
      `${outputDir}/prometheus.yml`,
      this.yamlStringify(prometheusConfig)
    );

    // Generate alerting rules
    const alertingRules = this.generateAlertingRules();
    await fs.writeFile(
      `${outputDir}/rules.yml`,
      this.yamlStringify(alertingRules)
    );

    // Generate Grafana datasource config
    const datasourceConfig = {
      apiVersion: 1,
      datasources: [
        {
          name: this.config.prometheus.datasourceName,
          type: 'prometheus',
          access: 'proxy',
          url: this.config.prometheus.url,
          isDefault: true
        }
      ]
    };
    await fs.writeFile(
      `${outputDir}/grafana/provisioning/datasources/prometheus.yml`,
      this.yamlStringify(datasourceConfig)
    );

    // Generate Grafana dashboard configs
    const dashboardConfig = {
      apiVersion: 1,
      providers: [
        {
          name: 'MCP Dashboards',
          type: 'file',
          folder: 'MCP',
          options: {
            path: '/etc/grafana/provisioning/dashboards'
          }
        }
      ]
    };
    await fs.writeFile(
      `${outputDir}/grafana/provisioning/dashboards/dashboards.yml`,
      this.yamlStringify(dashboardConfig)
    );

    // Generate dashboard JSON files
    for (const dashboard of this.config.dashboards) {
      const grafanaDashboard = this.generateGrafanaDashboard(dashboard);
      await fs.writeFile(
        `${outputDir}/grafana/provisioning/dashboards/${dashboard.id}.json`,
        JSON.stringify(grafanaDashboard, null, 2)
      );
    }

    // Generate Docker Compose
    const dockerCompose = this.generateDockerCompose();
    await fs.writeFile(
      `${outputDir}/docker-compose.yml`,
      this.yamlStringify(dockerCompose)
    );

    // Generate Alertmanager config
    const alertmanagerConfig = {
      global: {
        smtp_smarthost: 'localhost:587',
        smtp_from: 'alerts@ai-filesystem-mcp.dev'
      },
      route: {
        group_by: ['alertname'],
        group_wait: '10s',
        group_interval: '10s',
        repeat_interval: '1h',
        receiver: 'web.hook'
      },
      receivers: [
        {
          name: 'web.hook',
          webhook_configs: [
            {
              url: 'http://localhost:5001/webhook'
            }
          ]
        }
      ]
    };
    await fs.writeFile(
      `${outputDir}/alertmanager.yml`,
      this.yamlStringify(alertmanagerConfig)
    );

    // Generate setup script
    const setupScript = `#!/bin/bash
# Setup monitoring stack for AI FileSystem MCP

echo "🚀 Starting monitoring stack..."

# Pull all required images
docker-compose pull

# Start the monitoring stack
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "📊 Checking service status..."
docker-compose ps

echo "✅ Monitoring stack is ready!"
echo ""
echo "🔗 Access URLs:"
echo "  Grafana:      http://localhost:3001 (admin/admin123)"
echo "  Prometheus:   http://localhost:9090"
echo "  Alertmanager: http://localhost:9093"
echo ""
echo "📚 Import dashboards from: ./grafana/provisioning/dashboards/"
`;

    await fs.writeFile(`${outputDir}/setup.sh`, setupScript);
    await fs.chmod(`${outputDir}/setup.sh`, 0o755);

    console.log('✅ Monitoring stack setup complete!');
    console.log(`📁 Files generated in: ${outputDir}`);
    console.log(`🚀 Run: cd ${outputDir} && ./setup.sh`);
  }

  // Simple YAML stringify (basic implementation)
  private yamlStringify(obj: any, indent = 0): string {
    const spaces = ' '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}:\n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${this.yamlStringify(value, indent + 2)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}- ${this.yamlStringify(item, indent + 2).trim()}\n`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        }
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }
}

// CLI execution
async function main() {
  const setup = new DashboardSetup();
  await setup.setupMonitoring();
}

// ESM module check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default DashboardSetup;