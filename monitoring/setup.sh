#!/bin/bash
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
