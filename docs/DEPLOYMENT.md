# Deployment Guide

This document describes the deployment process for the TechCreator Inventory Buy and Rental application using GitHub Actions and Vercel.

## Table of Contents

- [Overview](#overview)
- [Environments](#environments)
- [Prerequisites](#prerequisites)
- [Deployment Process](#deployment-process)
- [Tag Naming Convention](#tag-naming-convention)
- [Environment Variables](#environment-variables)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)
- [CI/CD Pipeline](#cicd-pipeline)

## Overview

The application uses a tag-based deployment strategy with GitHub Actions and Vercel. When you push a tag with a specific prefix (`dev/`, `uat/`, or `prd/`), it automatically triggers a deployment to the corresponding environment.

## Environments

The project maintains three separate environments:

| Environment | Purpose | Tag Prefix | Auto-Migration |
|------------|---------|------------|----------------|
| **Development** | Testing new features and bug fixes | `dev/v*` | ✅ Yes |
| **UAT** | User acceptance testing and staging | `uat/v*` | ✅ Yes |
| **Production** | Live application for end users | `prd/v*` | ❌ Manual review required |

Each environment has its own:
- Vercel project
- MongoDB database
- Environment variables
- Deployment URL

## Prerequisites

### 1. Vercel Setup

Create three separate Vercel projects (recommended for better isolation):
- `techcreator-inventory-dev`
- `techcreator-inventory-uat`
- `techcreator-inventory-prd`

For each project, obtain:
- `VERCEL_ORG_ID` - Your Vercel organization/team ID
- `VERCEL_PROJECT_ID` - Unique project ID for each environment
- `VERCEL_TOKEN` - Personal access token (can be shared across projects)

To find these values:
1. Go to Vercel Dashboard → Settings
2. Copy the Organization ID (Team ID)
3. Go to Project Settings → General → Project ID
4. Generate a token at: https://vercel.com/account/tokens

### 2. GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### Vercel Configuration
```
VERCEL_TOKEN              # Your Vercel personal access token
VERCEL_ORG_ID            # Your Vercel organization/team ID
VERCEL_PROJECT_ID_DEV    # Development project ID
VERCEL_PROJECT_ID_UAT    # UAT project ID
VERCEL_PROJECT_ID_PRD    # Production project ID
```

#### Environment-Specific Database Credentials
```
MONGODB_URI_DEV          # Development MongoDB connection string
MONGODB_URI_UAT          # UAT MongoDB connection string
MONGODB_URI_PRD          # Production MongoDB connection string
```

#### Environment-Specific Auth Secrets
```
AUTH_SECRET_DEV          # Development NextAuth secret
AUTH_SECRET_UAT          # UAT NextAuth secret
AUTH_SECRET_PRD          # Production NextAuth secret
```

> **Note**: Generate secure random strings for AUTH_SECRET using:
> ```bash
> openssl rand -base64 32
> ```

### 3. Vercel Project Environment Variables

Configure the following environment variables in each Vercel project dashboard (Settings → Environment Variables):

**Required for all environments:**
```
MONGODB_URI              # MongoDB connection string
AUTH_SECRET              # NextAuth secret key
AUTH_TRUST_HOST=true     # Required for NextAuth
NODE_ENV=production      # Set to production
NEXTAUTH_URL             # Full URL of your deployment (e.g., https://app-dev.vercel.app)
```

## Deployment Process

### Step 1: Prepare Your Changes

1. Create a feature branch and make your changes
2. Test locally: `npm run dev`
3. Run quality checks:
   ```bash
   npm run lint
   npm run type-check
   npm run build
   ```

### Step 2: Merge to Main

1. Create a pull request to `main`
2. Review and merge after approval
3. Pull the latest main branch locally:
   ```bash
   git checkout main
   git pull origin main
   ```

### Step 3: Create and Push Deployment Tag

Choose the appropriate environment and create a tag:

#### Development Deployment
```bash
git tag dev/v1.2.3
git push origin dev/v1.2.3
```

#### UAT Deployment
```bash
git tag uat/v1.2.3
git push origin uat/v1.2.3
```

#### Production Deployment
```bash
# ⚠️ IMPORTANT: Ensure UAT testing is complete and migrations are reviewed
git tag prd/v1.2.3
git push origin prd/v1.2.3
```

### Step 4: Monitor Deployment

1. Go to GitHub Actions: `https://github.com/liveedevteam/techcreator-inventorybuyandrental/actions`
2. Watch the workflow execution
3. Check the deployment summary for the URL and status
4. Verify the deployment in Vercel dashboard

### Step 5: Verify Deployment

1. Open the deployment URL
2. Test critical functionality:
   - Login/Authentication
   - Database connectivity
   - API endpoints
   - User permissions

## Tag Naming Convention

Tags follow semantic versioning with environment prefixes:

```
{environment}/v{major}.{minor}.{patch}
```

### Examples

- `dev/v1.0.0` - First development release
- `dev/v1.0.1` - Development patch release
- `dev/v1.1.0` - Development minor release
- `uat/v1.0.0` - First UAT release
- `prd/v1.0.0` - First production release
- `prd/v2.0.0` - Production major release

### Versioning Guidelines

- **Patch** (x.x.1): Bug fixes, small updates
- **Minor** (x.1.x): New features, non-breaking changes
- **Major** (1.x.x): Breaking changes, major updates

> **Best Practice**: Keep version numbers synchronized across environments for the same codebase state.

## Environment Variables

### Managing Environment Variables

Environment variables are managed in two places:

1. **GitHub Secrets**: Used during CI/CD for database migrations
2. **Vercel Dashboard**: Used by the deployed application at runtime

### Adding a New Environment Variable

1. Add to Vercel project (Settings → Environment Variables)
2. If needed in CI/CD, add to GitHub Secrets
3. Document in `.env.example`
4. Update this documentation

### Required Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `AUTH_SECRET` | NextAuth encryption secret | `random-32-char-string` |
| `AUTH_TRUST_HOST` | Trust proxy headers | `true` |
| `NODE_ENV` | Node environment | `production` |
| `NEXTAUTH_URL` | Full application URL | `https://app.vercel.app` |

## Rollback Procedures

### Method 1: Instant Rollback via Vercel (Recommended)

1. Go to Vercel Dashboard
2. Select the project and environment
3. Go to "Deployments" tab
4. Find the previous working deployment
5. Click "..." → "Promote to Production"

**Advantages**: Instant, no code changes needed, preserves Git history

### Method 2: Redeploy Previous Version via Tag

1. Identify the last working version:
   ```bash
   git tag --list 'prd/v*' --sort=-version:refname
   ```

2. Create a new rollback tag:
   ```bash
   # If last working version was prd/v1.2.0
   git checkout prd/v1.2.0
   git tag prd/v1.2.1-rollback
   git push origin prd/v1.2.1-rollback
   ```

3. Monitor GitHub Actions for deployment

### Method 3: Emergency Database Rollback

If migrations caused issues:

1. Check migration status:
   ```bash
   npm run migrate:status
   ```

2. Rollback last migration:
   ```bash
   npm run migrate:down
   ```

3. Redeploy previous version using Method 1 or 2

### Rollback Checklist

- [ ] Identify the issue and last working version
- [ ] Check if database migrations were involved
- [ ] Notify team members about the rollback
- [ ] Execute rollback procedure
- [ ] Verify application functionality
- [ ] Document the incident and root cause
- [ ] Plan fix and redeployment

## Troubleshooting

### Deployment Fails at Quality Checks

**Symptoms**: Linting or type-checking fails in CI/CD

**Solutions**:
```bash
# Run checks locally
npm run lint
npm run type-check

# Fix linting issues automatically
npm run lint -- --fix

# Check for TypeScript errors
npx tsc --noEmit
```

### Migration Failures

**Symptoms**: Migration check fails, deployment stops

**Common Issues**:
1. **Connection timeout**: Check MONGODB_URI in GitHub Secrets
2. **Authentication failed**: Verify MongoDB credentials
3. **Network restrictions**: Ensure GitHub Actions IP can access MongoDB

**Debug Steps**:
```bash
# Test connection locally
MONGODB_URI="your-connection-string" npm run migrate:status

# Check migration files
ls -la migrations/

# Verify connection string format
# Should be: mongodb+srv://username:password@cluster.mongodb.net/database
```

### Vercel Deployment Fails

**Symptoms**: Build succeeds but Vercel deploy fails

**Solutions**:
1. Verify `VERCEL_TOKEN` is valid and not expired
2. Check `VERCEL_PROJECT_ID` matches the correct environment
3. Ensure `VERCEL_ORG_ID` is correct
4. Verify Vercel project isn't paused or deleted

**Generate new token**: https://vercel.com/account/tokens

### Application Errors After Deployment

**Symptoms**: Deployment succeeds but app shows errors

**Common Issues**:
1. **Missing environment variables**: Check Vercel project settings
2. **Database connection**: Verify MONGODB_URI in Vercel
3. **Authentication issues**: Ensure AUTH_SECRET and NEXTAUTH_URL are set
4. **CORS errors**: Check AUTH_TRUST_HOST=true is set

**Debug Steps**:
1. Check Vercel deployment logs: Project → Deployments → Select deployment → Logs
2. Check Runtime Logs: Project → Logs tab
3. Test API endpoints: `/api/auth/session`
4. Verify environment variables: Project → Settings → Environment Variables

### Tag Already Exists Error

**Symptoms**: `git push` fails with "tag already exists"

**Solution**:
```bash
# Delete local tag
git tag -d dev/v1.0.0

# Delete remote tag
git push origin :refs/tags/dev/v1.0.0

# Create new tag with incremented version
git tag dev/v1.0.1
git push origin dev/v1.0.1
```

### Health Check Fails

**Symptoms**: Post-deployment validation fails

**Solutions**:
1. Check if deployment URL is accessible
2. Verify application starts correctly (check logs)
3. Ensure no critical environment variables are missing
4. Check if MongoDB is accessible from Vercel

## CI/CD Pipeline

### Pipeline Stages

The GitHub Actions workflow consists of the following stages:

1. **Setup** (5-10 seconds)
   - Determines target environment from tag
   - Sets environment-specific variables

2. **Quality Checks** (2-3 minutes)
   - Checkout code
   - Install dependencies
   - Run linting (`npm run lint`)
   - Run type checking (`npm run type-check`)
   - Build application (`npm run build`)

3. **Migration Check** (30-60 seconds)
   - Check migration status
   - Run migrations (auto for dev/uat, manual review for prd)

4. **Deploy** (3-5 minutes)
   - Install Vercel CLI
   - Pull Vercel environment configuration
   - Build project artifacts
   - Deploy to Vercel production
   - Generate deployment URL

5. **Post-Deploy** (15-20 seconds)
   - Wait for deployment stabilization
   - Perform health check
   - Report deployment status

**Total Duration**: ~6-9 minutes

### Pipeline Features

- ✅ Automated linting and type checking
- ✅ Build verification before deployment
- ✅ Database migration validation
- ✅ Automatic deployment to Vercel
- ✅ Health check after deployment
- ✅ Deployment summary with URL
- ✅ Environment-specific configuration
- ✅ Production safety checks

### Skipping CI/CD

To push changes without triggering deployment, avoid pushing tags:

```bash
git push origin main  # No deployment triggered
```

Only tags matching the pattern trigger deployments:
- `dev/v*` → Development
- `uat/v*` → UAT
- `prd/v*` → Production

## Best Practices

### 1. Development Workflow

1. Develop and test locally
2. Deploy to `dev` first
3. Test in development environment
4. Deploy to `uat` after dev testing
5. Conduct user acceptance testing
6. Deploy to `prd` only after UAT approval

### 2. Production Deployment Checklist

Before deploying to production:

- [ ] All features tested in UAT
- [ ] User acceptance testing completed
- [ ] Performance testing passed
- [ ] Security review completed
- [ ] Database migrations reviewed and tested
- [ ] Rollback plan documented
- [ ] Team notified about deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Monitoring and alerts active

### 3. Database Migration Safety

- Always test migrations in `dev` first
- Verify migrations in `uat` before production
- Review migration scripts for production impact
- Backup production database before major migrations
- Use migration rollback (`migrate:down`) if issues occur

### 4. Version Management

- Keep a CHANGELOG.md updated with version changes
- Use meaningful commit messages
- Tag releases after thorough testing
- Document breaking changes clearly
- Communicate version updates to stakeholders

### 5. Security

- Rotate `AUTH_SECRET` periodically
- Use strong, unique passwords for each environment
- Restrict database access to necessary IPs only
- Enable MongoDB audit logging for production
- Review and update dependencies regularly
- Use environment-specific credentials (never share across environments)

## Support

For deployment issues or questions:

1. Check this documentation
2. Review GitHub Actions logs
3. Check Vercel deployment logs
4. Contact the development team
5. Create an issue in the repository

---

**Last Updated**: December 14, 2025  
**Version**: 1.0.0
