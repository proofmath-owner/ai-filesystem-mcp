# AI FileSystem MCP Deployment Guide

This guide covers the complete deployment process for AI FileSystem MCP across different environments.

## 📋 Pre-Deployment Checklist

### System Requirements
- **Node.js**: 18.x or higher (20.x recommended)
- **NPM**: 8.x or higher
- **Memory**: Minimum 512MB, recommended 2GB
- **Storage**: Minimum 1GB free space
- **OS**: Linux, macOS, or Windows

### Required Secrets
```bash
# NPM Publishing
NPM_TOKEN=your-npm-token

# GitHub Container Registry
GITHUB_TOKEN=your-github-token

# Code Coverage
CODECOV_TOKEN=your-codecov-token

# Production Environment
MCP_API_KEY=your-api-key
MCP_DATABASE_URL=your-database-url
MCP_REDIS_URL=your-redis-url
```

## 🚀 Deployment Options

### 1. NPM Package Deployment

#### Publishing to NPM Registry

1. **Prepare for Release**
```bash
# Run all checks
npm run release:prepare

# This runs:
# - npm run build
# - npm run test:all
# - npm run security:scan
```

2. **Version Bump**
```bash
# Patch version (2.0.0 → 2.0.1)
npm version patch

# Minor version (2.0.0 → 2.1.0)
npm version minor

# Major version (2.0.0 → 3.0.0)
npm version major

# Pre-release version
npm version prerelease --preid=beta
```

3. **Manual Publishing**
```bash
# Login to NPM
npm login

# Publish to NPM
npm publish --access public

# Publish beta version
npm publish --tag beta
```

4. **Automated Release** (via GitHub Actions)
```bash
# Create and push a tag
git tag v2.0.0
git push origin v2.0.0

# This triggers the release workflow
```

### 2. Docker Deployment

#### Building Docker Images

```bash
# Build for current platform
npm run docker:build

# Build multi-platform image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ai-filesystem-mcp:latest .

# Build with specific tag
docker build -t ai-filesystem-mcp:v2.0.0 .
```

#### Running Docker Container

```bash
# Basic run
npm run docker:run

# Run with environment variables
docker run -d \
  --name mcp-server \
  -p 3000:3000 \
  -e MCP_SECURITY_LEVEL=moderate \
  -e MCP_API_KEY=your-api-key \
  -v $(pwd)/data:/app/data \
  ai-filesystem-mcp:latest

# Run with custom config
docker run -d \
  --name mcp-server \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/data:/app/data \
  ai-filesystem-mcp:latest
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    image: ghcr.io/your-org/ai-filesystem-mcp:latest
    container_name: mcp-server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MCP_SECURITY_LEVEL=moderate
      - MCP_API_KEY=${MCP_API_KEY}
      - MCP_DATABASE_URL=${DATABASE_URL}
      - MCP_REDIS_URL=${REDIS_URL}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./config:/app/config
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  redis:
    image: redis:7-alpine
    container_name: mcp-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

  monitoring:
    image: prom/prometheus
    container_name: mcp-monitoring
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    restart: unless-stopped

volumes:
  redis-data:
  prometheus-data:
```

### 3. Kubernetes Deployment

#### Deployment Configuration

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-filesystem-mcp
  labels:
    app: ai-filesystem-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-filesystem-mcp
  template:
    metadata:
      labels:
        app: ai-filesystem-mcp
    spec:
      containers:
      - name: mcp-server
        image: ghcr.io/your-org/ai-filesystem-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MCP_SECURITY_LEVEL
          value: "moderate"
        - name: MCP_API_KEY
          valueFrom:
            secretKeyRef:
              name: mcp-secrets
              key: api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /app/config
        - name: data
          mountPath: /app/data
      volumes:
      - name: config
        configMap:
          name: mcp-config
      - name: data
        persistentVolumeClaim:
          claimName: mcp-data-pvc
```

#### Service Configuration

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ai-filesystem-mcp
spec:
  selector:
    app: ai-filesystem-mcp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-config
data:
  mcp-config.json: |
    {
      "server": {
        "port": 3000,
        "host": "0.0.0.0"
      },
      "security": {
        "level": "moderate",
        "maxFileSize": "10MB"
      },
      "performance": {
        "cacheEnabled": true,
        "cacheTTL": 300000
      }
    }
```

#### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-secrets
type: Opaque
stringData:
  api-key: "your-api-key-here"
  database-url: "your-database-url"
  redis-url: "redis://redis-service:6379"
```

### 4. Cloud Platform Deployments

#### AWS ECS

```json
{
  "family": "ai-filesystem-mcp",
  "taskRoleArn": "arn:aws:iam::123456789:role/mcp-task-role",
  "executionRoleArn": "arn:aws:iam::123456789:role/mcp-execution-role",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "mcp-server",
      "image": "ghcr.io/your-org/ai-filesystem-mcp:latest",
      "memory": 512,
      "cpu": 256,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "MCP_SECURITY_LEVEL",
          "value": "moderate"
        }
      ],
      "secrets": [
        {
          "name": "MCP_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:123456789:secret:mcp-api-key"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Google Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy ai-filesystem-mcp \
  --image ghcr.io/your-org/ai-filesystem-mcp:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,MCP_SECURITY_LEVEL=moderate" \
  --set-secrets="MCP_API_KEY=mcp-api-key:latest" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

#### Azure Container Instances

```bash
# Deploy to Azure
az container create \
  --resource-group mcp-rg \
  --name ai-filesystem-mcp \
  --image ghcr.io/your-org/ai-filesystem-mcp:latest \
  --dns-name-label mcp-server \
  --ports 3000 \
  --cpu 1 \
  --memory 1 \
  --environment-variables \
    NODE_ENV=production \
    MCP_SECURITY_LEVEL=moderate \
  --secure-environment-variables \
    MCP_API_KEY=$MCP_API_KEY
```

## 🔧 Environment Configuration

### Development Environment

```bash
# .env.development
NODE_ENV=development
MCP_SECURITY_LEVEL=permissive
MCP_PORT=3000
MCP_HOST=localhost
MCP_LOG_LEVEL=debug
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=300000
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
MCP_SECURITY_LEVEL=moderate
MCP_PORT=3000
MCP_HOST=0.0.0.0
MCP_LOG_LEVEL=info
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=600000
MCP_API_KEY=${STAGING_API_KEY}
MCP_DATABASE_URL=${STAGING_DATABASE_URL}
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
MCP_SECURITY_LEVEL=strict
MCP_PORT=3000
MCP_HOST=0.0.0.0
MCP_LOG_LEVEL=warn
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=1800000
MCP_API_KEY=${PROD_API_KEY}
MCP_DATABASE_URL=${PROD_DATABASE_URL}
MCP_REDIS_URL=${PROD_REDIS_URL}
MCP_SENTRY_DSN=${SENTRY_DSN}
```

## 📊 Monitoring Setup

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mcp-server'
    static_configs:
      - targets: ['mcp-server:3000']
    metrics_path: /metrics
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "AI FileSystem MCP Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(mcp_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(mcp_errors_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, mcp_response_time_seconds)"
          }
        ]
      }
    ]
  }
}
```

## 🔐 Security Hardening

### Production Security Checklist

- [ ] Set `MCP_SECURITY_LEVEL=strict`
- [ ] Configure firewall rules
- [ ] Enable HTTPS/TLS
- [ ] Set up API rate limiting
- [ ] Configure CORS properly
- [ ] Enable audit logging
- [ ] Set up intrusion detection
- [ ] Configure backup strategy
- [ ] Test disaster recovery
- [ ] Review and rotate secrets

### SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.ai-filesystem-mcp.dev;

    ssl_certificate /etc/ssl/certs/mcp-cert.pem;
    ssl_certificate_key /etc/ssl/private/mcp-key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚨 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker logs mcp-server

# Verify environment variables
docker exec mcp-server env

# Check health endpoint
curl http://localhost:3000/health
```

#### High Memory Usage
```bash
# Check memory usage
docker stats mcp-server

# Increase memory limits
docker update --memory 1g mcp-server
```

#### Permission Errors
```bash
# Fix volume permissions
docker exec mcp-server chown -R mcp:mcp /app/data
```

### Debug Mode

```bash
# Enable debug logging
export MCP_LOG_LEVEL=debug
export NODE_ENV=development

# Run with verbose output
npm run dev -- --verbose
```

## 📈 Performance Tuning

### Node.js Optimization

```bash
# Increase heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Enable cluster mode
PM2_INSTANCES=4 pm2 start dist/index.js
```

### Cache Configuration

```json
{
  "cache": {
    "enabled": true,
    "maxSize": "500MB",
    "ttl": 3600000,
    "strategy": "lru",
    "redis": {
      "enabled": true,
      "url": "redis://localhost:6379"
    }
  }
}
```

## 🔄 Zero-Downtime Deployment

### Blue-Green Deployment

```bash
# 1. Deploy to green environment
kubectl set image deployment/mcp-green mcp-server=ai-filesystem-mcp:v2.0.1

# 2. Run smoke tests
./scripts/smoke-test.sh green

# 3. Switch traffic
kubectl patch service mcp-service -p '{"spec":{"selector":{"version":"green"}}}'

# 4. Monitor
kubectl logs -f deployment/mcp-green

# 5. Rollback if needed
kubectl patch service mcp-service -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Rolling Update

```bash
# Update with zero downtime
kubectl set image deployment/ai-filesystem-mcp mcp-server=ai-filesystem-mcp:v2.0.1 --record

# Monitor rollout
kubectl rollout status deployment/ai-filesystem-mcp

# Rollback if issues
kubectl rollout undo deployment/ai-filesystem-mcp
```

## 📝 Post-Deployment

### Verification Steps

1. **Health Check**
   ```bash
   curl http://your-server/health
   ```

2. **API Test**
   ```bash
   curl -X POST http://your-server/api/execute \
     -H "Content-Type: application/json" \
     -d '{"command": "read_file", "args": {"path": "test.txt"}}'
   ```

3. **Performance Test**
   ```bash
   npm run benchmark
   ```

4. **Security Scan**
   ```bash
   npm run security:scan
   ```

### Monitoring Dashboard

Access your monitoring dashboard:
- Grafana: http://your-server:3001
- Prometheus: http://your-server:9090
- Health: http://your-server:3000/health

---

This deployment guide covers the essential steps for deploying AI FileSystem MCP in production. Always test in staging before deploying to production!