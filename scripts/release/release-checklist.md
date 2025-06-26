# Release Checklist for AI FileSystem MCP

## Pre-Release Checklist

### 📋 Code Quality
- [ ] All tests passing (`npm run test:all`)
- [ ] Code coverage above 80% (`npm run test:coverage`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run build`)
- [ ] Security scan clean (`npm run security:scan`)
- [ ] Performance benchmarks stable (`npm run benchmark`)

### 📝 Documentation
- [ ] README.md updated with new features
- [ ] CHANGELOG.md updated with version changes
- [ ] API documentation current (`npm run docs:generate`)
- [ ] User guides updated for new features
- [ ] Migration guide created (if breaking changes)

### 🔐 Security
- [ ] Dependencies updated and audited
- [ ] Secrets properly configured
- [ ] Security policy reviewed
- [ ] Vulnerability scan completed
- [ ] Access controls verified

### 🏗️ Build & Package
- [ ] Build successful (`npm run build`)
- [ ] Package creation successful (`npm pack`)
- [ ] Docker image builds successfully
- [ ] All environments tested (dev, staging, prod)

## Release Process

### 1. Version Bump
```bash
# Choose appropriate version bump
npm version patch   # Bug fixes (2.0.0 → 2.0.1)
npm version minor   # New features (2.0.0 → 2.1.0)
npm version major   # Breaking changes (2.0.0 → 3.0.0)

# For pre-release
npm version prerelease --preid=beta  # (2.0.0 → 2.0.1-beta.0)
```

### 2. Tag Creation
```bash
# Create annotated tag
git tag -a v2.0.0 -m "Release version 2.0.0

Features:
- Enhanced performance monitoring
- Improved security scanning
- New deployment options

Bug fixes:
- Fixed memory leak in cache manager
- Resolved path traversal issues

Breaking changes:
- API endpoint restructure (see migration guide)
"

# Push tag
git push origin v2.0.0
```

### 3. Release Notes Template
```markdown
# Release v2.0.0

## 🚀 New Features
- Enhanced production monitoring with real-time metrics
- Comprehensive security scanning framework
- Docker containerization with multi-platform support
- CI/CD pipeline with automated testing

## 🐛 Bug Fixes
- Fixed memory leak in LRU cache implementation
- Resolved path traversal vulnerability
- Improved error handling in command execution

## 💔 Breaking Changes
- Command API restructured for better consistency
- Configuration format updated (see migration guide)
- Minimum Node.js version raised to 18.0

## 📈 Performance Improvements
- 40% faster file operations through streaming
- Reduced memory usage by 25%
- Enhanced caching with Redis support

## 🔒 Security Enhancements
- Multi-tier security model implementation
- Automated vulnerability scanning
- Improved input validation and sanitization

## 📚 Documentation Updates
- Complete API reference with interactive demo
- Deployment guide for all major platforms
- Security best practices documentation

## 🏗️ Infrastructure
- GitHub Actions CI/CD pipeline
- Docker images published to GHCR
- Kubernetes deployment manifests
- Monitoring and alerting setup

## Migration Guide
See [MIGRATION.md](MIGRATION.md) for detailed upgrade instructions.

## Contributors
Special thanks to all contributors who made this release possible!
```

### 4. GitHub Release
- [ ] Create GitHub release from tag
- [ ] Upload build artifacts (.tgz file)
- [ ] Include detailed release notes
- [ ] Mark as pre-release if beta/alpha

### 5. NPM Publishing
```bash
# Login to NPM (if not already)
npm login

# Publish stable release
npm publish --access public

# Publish beta release
npm publish --tag beta --access public

# Verify publication
npm info ai-filesystem-mcp
```

### 6. Docker Publishing
```bash
# Build and push to GitHub Container Registry
docker build -t ghcr.io/your-org/ai-filesystem-mcp:v2.0.0 .
docker build -t ghcr.io/your-org/ai-filesystem-mcp:latest .

docker push ghcr.io/your-org/ai-filesystem-mcp:v2.0.0
docker push ghcr.io/your-org/ai-filesystem-mcp:latest

# Verify images
docker pull ghcr.io/your-org/ai-filesystem-mcp:v2.0.0
```

## Post-Release Checklist

### 📢 Announcements
- [ ] Update website with new version
- [ ] Announce on social media channels
- [ ] Notify community in discussions
- [ ] Update package managers (Homebrew, etc.)

### 📊 Monitoring
- [ ] Monitor download statistics
- [ ] Track error rates in production
- [ ] Monitor performance metrics
- [ ] Check user feedback and issues

### 🔄 Documentation Updates
- [ ] Update installation instructions
- [ ] Refresh getting started guides
- [ ] Update examples and tutorials
- [ ] Archive old version docs

### 🐛 Bug Tracking
- [ ] Monitor issue tracker for new bugs
- [ ] Set up alerts for critical issues
- [ ] Prepare hotfix process if needed
- [ ] Plan next patch release if required

## Rollback Plan

### Emergency Rollback
If critical issues are discovered:

1. **NPM Rollback**
```bash
# Deprecate problematic version
npm deprecate ai-filesystem-mcp@2.0.0 "Critical bug found, please upgrade to 2.0.1"

# Unpublish if within 24 hours (last resort)
npm unpublish ai-filesystem-mcp@2.0.0
```

2. **Docker Rollback**
```bash
# Update latest tag to previous version
docker tag ghcr.io/your-org/ai-filesystem-mcp:v1.9.0 ghcr.io/your-org/ai-filesystem-mcp:latest
docker push ghcr.io/your-org/ai-filesystem-mcp:latest
```

3. **GitHub Release**
- Mark release as pre-release
- Add warning notice to release notes
- Create hotfix release ASAP

## Version Naming Convention

### Semantic Versioning
- **MAJOR**: Breaking changes (2.0.0 → 3.0.0)
- **MINOR**: New features, backward compatible (2.0.0 → 2.1.0)
- **PATCH**: Bug fixes, backward compatible (2.0.0 → 2.0.1)

### Pre-release Tags
- **Alpha**: `2.1.0-alpha.1` (very early, unstable)
- **Beta**: `2.1.0-beta.1` (feature complete, testing)
- **RC**: `2.1.0-rc.1` (release candidate, final testing)

### Branch Strategy
- **main**: Production releases only
- **develop**: Integration branch for features
- **feature/***: Individual feature branches
- **hotfix/***: Critical bug fixes
- **release/***: Release preparation branches

## Automation Scripts

### Release Script
```bash
#!/bin/bash
# scripts/release/release.sh

set -e

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "🚀 Starting release process for version $VERSION"

# Run all checks
echo "📋 Running pre-release checks..."
npm run release:prepare

# Version bump
echo "📦 Bumping version to $VERSION..."
npm version $VERSION

# Build and test
echo "🏗️ Building and testing..."
npm run build
npm run test:all

# Create release notes
echo "📝 Generating release notes..."
npx conventional-changelog -p angular -r 2 > RELEASE_NOTES.md

echo "✅ Release preparation complete!"
echo "Next steps:"
echo "1. Review RELEASE_NOTES.md"
echo "2. Push tags: git push origin v$VERSION"
echo "3. Create GitHub release"
echo "4. Publish to NPM: npm publish"
```

### Deployment Script
```bash
#!/bin/bash
# scripts/release/deploy.sh

set -e

ENVIRONMENT=$1
VERSION=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ]; then
    echo "Usage: $0 <environment> <version>"
    exit 1
fi

echo "🚀 Deploying version $VERSION to $ENVIRONMENT"

case $ENVIRONMENT in
    "staging")
        kubectl set image deployment/mcp-staging mcp-server=ghcr.io/your-org/ai-filesystem-mcp:$VERSION
        ;;
    "production")
        kubectl set image deployment/mcp-production mcp-server=ghcr.io/your-org/ai-filesystem-mcp:$VERSION
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/mcp-$ENVIRONMENT

echo "✅ Deployment complete!"
```

## Release Schedule

### Regular Releases
- **Major releases**: Every 6-12 months
- **Minor releases**: Monthly (feature releases)
- **Patch releases**: As needed (bug fixes)
- **Security releases**: Immediate (critical vulnerabilities)

### LTS Support
- Current major version: Full support
- Previous major version: Security fixes only
- Older versions: End of life

---

This checklist ensures consistent, high-quality releases of AI FileSystem MCP. Always follow the process and document any deviations for future improvement.