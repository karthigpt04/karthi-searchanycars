# SearchAnyCars.com - Deployment & Infrastructure Plan

> **Current State:** Single-server Express + SQLite + Vite SPA deployed to Azure App Service
> **Target State:** Production-grade AWS infrastructure with PostgreSQL, Redis, S3, CDN, and CI/CD
> **Region:** ap-south-1 (Mumbai) - closest to primary user base in India

---

## Table of Contents

1. [AWS Architecture](#1-aws-architecture)
2. [CI/CD Pipeline](#2-cicd-pipeline)
3. [Monitoring & Observability](#3-monitoring--observability)
4. [Performance Targets & Optimization](#4-performance-targets--optimization)
5. [Disaster Recovery](#5-disaster-recovery)
6. [Cost Estimation](#6-cost-estimation)
7. [Scaling Strategy](#7-scaling-strategy)

---

## 1. AWS Architecture

### 1.1 ASCII Architecture Diagram

```
                            ┌─────────────────────────────────┐
                            │         Route 53 (DNS)          │
                            │    searchanycars.com            │
                            │    api.searchanycars.com        │
                            └──────────┬──────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                      │
           ┌────────▼────────┐                   ┌────────▼────────┐
           │   CloudFront    │                   │   ACM (SSL)     │
           │   Distribution  │                   │   *.searchany   │
           │                 │                   │    cars.com     │
           └───┬─────────┬───┘                   └─────────────────┘
               │         │
     ┌─────────▼──┐  ┌───▼──────────────────────────────────────┐
     │  S3 Bucket │  │  Application Load Balancer (ALB)         │
     │  (Static   │  │  - SSL termination                       │
     │   Assets,  │  │  - Path-based routing                    │
     │   Images)  │  │  - Health checks on /api/health          │
     └────────────┘  └────────┬─────────────────┬───────────────┘
                              │                 │
                    ┌─────────▼──────┐ ┌────────▼────────┐
                    │   AZ-1         │ │   AZ-2          │
                    │ (ap-south-1a)  │ │ (ap-south-1b)   │
                    └────────────────┘ └─────────────────┘
    ┌─────────────────────────────────────────────────────────────┐
    │                        VPC (10.0.0.0/16)                    │
    │                                                             │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │              Public Subnets                          │    │
    │  │  ┌──────────────────┐  ┌──────────────────┐         │    │
    │  │  │ 10.0.1.0/24      │  │ 10.0.2.0/24      │         │    │
    │  │  │ NAT Gateway      │  │ NAT Gateway      │         │    │
    │  │  │ ALB Nodes        │  │ ALB Nodes        │         │    │
    │  │  └──────────────────┘  └──────────────────┘         │    │
    │  └─────────────────────────────────────────────────────┘    │
    │                                                             │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │              Private Subnets (App)                   │    │
    │  │  ┌──────────────────┐  ┌──────────────────┐         │    │
    │  │  │ 10.0.10.0/24     │  │ 10.0.11.0/24     │         │    │
    │  │  │                  │  │                  │         │    │
    │  │  │ ┌──────────────┐ │  │ ┌──────────────┐ │         │    │
    │  │  │ │ECS Fargate   │ │  │ │ECS Fargate   │ │         │    │
    │  │  │ │Task (API)    │ │  │ │Task (API)    │ │         │    │
    │  │  │ │1 vCPU / 2GB  │ │  │ │1 vCPU / 2GB  │ │         │    │
    │  │  │ └──────────────┘ │  │ └──────────────┘ │         │    │
    │  │  └──────────────────┘  └──────────────────┘         │    │
    │  └─────────────────────────────────────────────────────┘    │
    │                                                             │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │              Private Subnets (Data)                  │    │
    │  │  ┌──────────────────┐  ┌──────────────────┐         │    │
    │  │  │ 10.0.20.0/24     │  │ 10.0.21.0/24     │         │    │
    │  │  │                  │  │                  │         │    │
    │  │  │ ┌──────────────┐ │  │ ┌──────────────┐ │         │    │
    │  │  │ │RDS PostgreSQL│ │  │ │RDS PostgreSQL│ │         │    │
    │  │  │ │Primary       │ │  │ │Standby       │ │         │    │
    │  │  │ │db.t3.medium  │ │  │ │(Multi-AZ)    │ │         │    │
    │  │  │ └──────────────┘ │  │ └──────────────┘ │         │    │
    │  │  │                  │  │                  │         │    │
    │  │  │ ┌──────────────┐ │  │ ┌──────────────┐ │         │    │
    │  │  │ │ElastiCache   │ │  │ │ElastiCache   │ │         │    │
    │  │  │ │Redis Primary │ │  │ │Redis Replica │ │         │    │
    │  │  │ │cache.t3.micro│ │  │ │(failover)    │ │         │    │
    │  │  │ └──────────────┘ │  │ └──────────────┘ │         │    │
    │  │  └──────────────────┘  └──────────────────┘         │    │
    │  └─────────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────────┘

    External Services:
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │  SES (Email)  │  │  SNS / MSG91  │  │  Sentry       │
    │  Transactional│  │  (SMS/OTP)    │  │  (Errors)     │
    └───────────────┘  └───────────────┘  └───────────────┘
```

### 1.2 VPC Design

| Component | CIDR | Purpose |
|-----------|------|---------|
| VPC | 10.0.0.0/16 | 65,536 IPs total |
| Public Subnet AZ-1 | 10.0.1.0/24 | ALB, NAT Gateway |
| Public Subnet AZ-2 | 10.0.2.0/24 | ALB, NAT Gateway |
| Private Subnet App AZ-1 | 10.0.10.0/24 | ECS Fargate tasks |
| Private Subnet App AZ-2 | 10.0.11.0/24 | ECS Fargate tasks |
| Private Subnet Data AZ-1 | 10.0.20.0/24 | RDS, ElastiCache |
| Private Subnet Data AZ-2 | 10.0.21.0/24 | RDS standby, ElastiCache replica |

**Security Groups:**

| SG Name | Inbound | Source |
|---------|---------|--------|
| sg-alb | 80, 443 | 0.0.0.0/0 |
| sg-app | 4000 | sg-alb only |
| sg-rds | 5432 | sg-app only |
| sg-redis | 6379 | sg-app only |

### 1.3 Application Layer - ECS Fargate

**Why Fargate over EC2:** Zero server management, per-second billing, no AMI patching. The current Express app is stateless (images go to S3) making it ideal for containers.

**Service Configuration:**
- Cluster: `searchanycars-cluster`
- Service: `searchanycars-api`
- Task Definition: 1 vCPU, 2 GB RAM
- Desired count: 2 (one per AZ)
- Auto-scaling: Target tracking on CPU (70%) and request count (1000 req/target)
- Min tasks: 2, Max tasks: 8
- Health check: `GET /api/health` every 30s

**Dockerfile** (to be created):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
USER appuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "server/index.js"]
```

### 1.4 Database - RDS PostgreSQL

**Migration from SQLite to PostgreSQL:**

The current schema in `server/bootstrap.js` uses SQLite-specific syntax that needs conversion:

| SQLite (Current) | PostgreSQL (Target) |
|-------------------|---------------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| `INTEGER` (booleans) | `BOOLEAN` |
| `REAL` | `NUMERIC(12,2)` for prices, `REAL` for ratings |
| JSON stored as `TEXT` (`images_json`) | `JSONB` columns (native indexing) |

**RDS Configuration:**
- Engine: PostgreSQL 16
- Instance: db.t3.medium (2 vCPU, 4 GB RAM)
- Storage: 50 GB gp3 (auto-scaling to 200 GB)
- Multi-AZ: Enabled (synchronous standby in AZ-2)
- Encryption: AES-256 at rest (AWS KMS)
- Parameter Group: Custom with `shared_buffers=1GB`, `work_mem=16MB`
- Backup: Daily automated, 7-day retention, point-in-time recovery enabled
- Connection: Via Private Subnet only, SSL enforced

**Key Schema Changes for PostgreSQL:**
- `images_json TEXT` becomes `images JSONB DEFAULT '[]'::jsonb` (enables GIN indexing)
- `specs_json TEXT` becomes `specs JSONB DEFAULT '{}'::jsonb`
- Add full-text search index: `CREATE INDEX idx_listings_fts ON listings USING GIN(to_tsvector('english', title || ' ' || brand || ' ' || model))`
- Replace `LIKE '%keyword%'` searches with `to_tsvector @@ plainto_tsquery` for performance

### 1.5 Cache - ElastiCache Redis

**Use Cases:**
- API response caching (listing search results: 60s TTL)
- Session storage (if auth is added)
- Rate limiting counters
- Popular search result pre-warming
- Real-time counters (views, active users)

**Configuration:**
- Engine: Redis 7.x
- Node type: cache.t3.micro (Phase 1), cache.t3.small (Phase 2)
- Cluster mode: Disabled (single shard with replica)
- Multi-AZ: Enabled with automatic failover
- Encryption: In-transit and at-rest

**Caching Strategy:**
```
GET /api/listings?brand=Hyundai&fuel_type=Petrol
  -> Cache key: listings:v1:brand=Hyundai:fuel_type=Petrol:sort=default
  -> TTL: 60 seconds
  -> Invalidation: On any listing CREATE/UPDATE/DELETE

GET /api/listings/:id
  -> Cache key: listing:v1:{id}
  -> TTL: 300 seconds
  -> Invalidation: On specific listing UPDATE/DELETE

GET /api/categories
  -> Cache key: categories:v1:all
  -> TTL: 3600 seconds (rarely changes)
```

### 1.6 Storage - S3 + CloudFront

**S3 Buckets:**

| Bucket | Purpose | Access |
|--------|---------|--------|
| `searchanycars-images-prod` | Listing images (uploads) | CloudFront OAI |
| `searchanycars-static-prod` | Vite build output (dist/) | CloudFront OAI |
| `searchanycars-backups-prod` | DB exports, logs archive | Private only |

**Image Upload Flow Change:**

Current `server/storage.js` writes to local filesystem. Migration:
1. Replace `fs.writeFile` with AWS SDK `S3Client.putObject`
2. Return CloudFront URL instead of `/uploads/...` path
3. Add Sharp.js for image optimization on upload:
   - Convert to WebP
   - Generate thumbnails: 320px (card), 800px (detail), 1400px (full)
   - Strip EXIF metadata
   - Quality: 80%

**CloudFront Configuration:**
- Distribution 1: `cdn.searchanycars.com` - images and static assets
  - Origin: S3 buckets via OAI
  - Cache policy: 30-day TTL for images, 1-year for hashed Vite assets
  - Compress: gzip + brotli
  - Price class: PriceClass_200 (includes India)
- Distribution 2 (or behavior): API passthrough to ALB
  - Cache policy: No cache (passthrough to ALB)
  - Origin request policy: AllViewerAndWhitelist

### 1.7 Load Balancer - ALB

- Listener: HTTPS:443 (redirect HTTP:80 to HTTPS)
- SSL Certificate: ACM-managed for `*.searchanycars.com`
- Target Group: ECS Fargate tasks, port 4000
- Health Check: `GET /api/health`, 200 OK, interval 30s, threshold 3
- Sticky sessions: Disabled (app is stateless)
- Access logs: Enabled to S3

### 1.8 DNS - Route 53

| Record | Type | Target |
|--------|------|--------|
| searchanycars.com | A (Alias) | CloudFront distribution |
| www.searchanycars.com | CNAME | searchanycars.com |
| api.searchanycars.com | A (Alias) | ALB |
| cdn.searchanycars.com | A (Alias) | CloudFront distribution |

### 1.9 Email - SES

- Domain verification: `searchanycars.com`
- DKIM + SPF + DMARC configured
- Use cases: Booking confirmations, inquiry notifications, admin alerts
- Sending rate: Start with sandbox (move to production after approval)
- Templates: Stored in SES template library

### 1.10 SMS - MSG91

- Preferred over SNS for Indian market (better DLT compliance, lower cost)
- Use cases: OTP verification, booking confirmations
- Integration: REST API from ECS tasks
- Fallback: AWS SNS if MSG91 is unavailable

---

## 2. CI/CD Pipeline

### 2.1 Pipeline Architecture

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  GitHub   │───>│  Build   │───>│   Test   │───>│ Security │───>│  Deploy  │
│  Push/PR  │    │          │    │  & Lint  │    │   Scan   │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │               │               │               │
                 npm ci          jest/vitest      npm audit      Staging ──> Prod
                 vite build      eslint           trivy          (approval gate)
                 docker build    tsc --noEmit     snyk
```

### 2.2 GitHub Actions Workflow

```yaml
# .github/workflows/deploy-aws.yml
name: Build, Test & Deploy to AWS

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  AWS_REGION: ap-south-1
  ECR_REPOSITORY: searchanycars-api
  ECS_CLUSTER: searchanycars-cluster
  ECS_SERVICE_STAGING: searchanycars-api-staging
  ECS_SERVICE_PROD: searchanycars-api-prod

permissions:
  id-token: write
  contents: read

jobs:
  # ──────────────────────────────────────────
  # Job 1: Lint + Type Check
  # ──────────────────────────────────────────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint

  # ──────────────────────────────────────────
  # Job 2: Unit & Integration Tests
  # ──────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: searchanycars_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/searchanycars_test

  # ──────────────────────────────────────────
  # Job 3: Security Scan
  # ──────────────────────────────────────────
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          severity: HIGH,CRITICAL

  # ──────────────────────────────────────────
  # Job 4: Build & Push Docker Image
  # ──────────────────────────────────────────
  build:
    needs: [lint, test, security]
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build-image.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - uses: aws-actions/amazon-ecr-login@v2
        id: login-ecr
      - name: Build and push Docker image
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

  # ──────────────────────────────────────────
  # Job 5: Deploy to Staging
  # ──────────────────────────────────────────
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Run database migrations
        run: |
          aws ecs run-task \
            --cluster $ECS_CLUSTER \
            --task-definition searchanycars-migrate \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[${{ secrets.PRIVATE_SUBNET_IDS }}],securityGroups=[${{ secrets.APP_SG_ID }}]}" \
            --overrides '{"containerOverrides":[{"name":"migrate","command":["npm","run","migrate:up"]}]}'
      - name: Deploy to ECS Staging
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE_STAGING \
            --force-new-deployment
      - name: Wait for deployment stability
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_SERVICE_STAGING

  # ──────────────────────────────────────────
  # Job 6: Deploy to Production (manual approval)
  # ──────────────────────────────────────────
  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval in GitHub
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Run database migrations
        run: |
          aws ecs run-task \
            --cluster $ECS_CLUSTER \
            --task-definition searchanycars-migrate \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[${{ secrets.PRIVATE_SUBNET_IDS }}],securityGroups=[${{ secrets.APP_SG_ID }}]}"
      - name: Deploy to ECS Production (rolling)
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE_PROD \
            --force-new-deployment \
            --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200"
      - name: Wait for deployment stability
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_SERVICE_PROD
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "SearchAnyCars deployed to production: ${{ github.sha }}"}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 2.3 Database Migration Strategy

**Tool:** node-pg-migrate (lightweight, SQL-based, no ORM lock-in)

The current `bootstrap.js` auto-creates tables and seeds data. This must be replaced with versioned migrations:

```
migrations/
  001_create-categories.sql
  002_create-filter-definitions.sql
  003_create-category-filter-map.sql
  004_create-listings.sql
  005_create-indexes.sql
  006_seed-default-categories.sql
  007_seed-default-filters.sql
  008_convert-json-to-jsonb.sql   (future: for image columns)
```

**Migration commands:**
```json
{
  "scripts": {
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "migrate:create": "node-pg-migrate create"
  }
}
```

**Migration safety rules:**
- All migrations must be backward-compatible (no column drops until N+1 deploy)
- Run migrations in a separate ECS task before deploying new code
- Migrations run with a dedicated `searchanycars_migrate` DB user (DDL permissions)
- Application uses `searchanycars_app` DB user (DML only, no DDL)

### 2.4 Deployment Strategy: Rolling with Rollback

**Why rolling over blue-green:** Lower cost (no duplicate infrastructure). Acceptable for a startup. Blue-green can be adopted at Phase 3.

**Rolling deployment config:**
- `minimumHealthyPercent: 100` (never go below current capacity)
- `maximumPercent: 200` (spin up new tasks before draining old)
- Deregistration delay: 30s
- Health check grace period: 60s

**Rollback procedure:**
1. Automatic: ECS circuit breaker enabled - if new tasks fail health checks, rolls back to previous task definition
2. Manual: `aws ecs update-service --task-definition <previous-revision>`
3. Database: `npm run migrate:down` (if migration was the cause)

---

## 3. Monitoring & Observability

### 3.1 Three Pillars

```
┌─────────────────────────────────────────────────────────┐
│                    Observability Stack                    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Metrics    │  │    Logs     │  │   Traces    │     │
│  │ CloudWatch   │  │ CloudWatch  │  │ AWS X-Ray   │     │
│  │ + Grafana    │  │ Logs        │  │             │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│                   ┌──────▼──────┐                       │
│                   │  Alerting   │                       │
│                   │  Slack /    │                       │
│                   │  PagerDuty  │                       │
│                   └─────────────┘                       │
│                                                         │
│  External:                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Sentry    │  │ UptimeRobot │  │  Grafana    │     │
│  │  (Errors)   │  │ (Uptime)    │  │  Cloud      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Application Performance Monitoring

**Sentry Integration:**
- Install: `@sentry/node` for Express backend, `@sentry/react` for frontend
- Track: Unhandled exceptions, rejected promises, slow transactions
- Source maps: Upload during CI build for readable stack traces
- Environment tags: `staging` / `production`
- Sample rate: 100% errors, 20% transactions

**Express middleware to add:**
```javascript
// Performance tracking middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6
    cloudwatch.putMetricData({
      Namespace: 'SearchAnyCars',
      MetricData: [{
        MetricName: 'APIResponseTime',
        Value: durationMs,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'Endpoint', Value: req.route?.path || req.path },
          { Name: 'Method', Value: req.method },
          { Name: 'StatusCode', Value: String(res.statusCode) }
        ]
      }]
    })
  })
  next()
})
```

### 3.3 Custom CloudWatch Dashboards

**Dashboard: SearchAnyCars Operations**

| Widget | Metric | Source |
|--------|--------|--------|
| Active Listings | `COUNT(*) FROM listings WHERE listing_status='Active'` | Custom metric (cron Lambda, 5min) |
| Leads per Day | `SUM(lead_count)` delta | Custom metric |
| API Response Time (p50/p95/p99) | `APIResponseTime` | Custom namespace |
| Error Rate by Endpoint | `4xx/5xx count / total requests` | ALB metrics |
| Active ECS Tasks | `RunningTaskCount` | ECS CloudWatch |
| RDS CPU / Connections | `CPUUtilization`, `DatabaseConnections` | RDS CloudWatch |
| Redis Cache Hit Rate | `CacheHits / (CacheHits + CacheMisses)` | ElastiCache metrics |
| S3 Image Upload Rate | `PutRequests` | S3 CloudWatch |
| Real-time Users | Active WebSocket connections or CloudFront concurrent viewers | Custom |

### 3.4 Alerting Rules

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| High Error Rate | 5xx rate > 5% for 5 min | P1 - Critical | PagerDuty + Slack |
| API Latency Spike | p95 > 2s for 5 min | P2 - High | Slack #alerts |
| RDS CPU High | > 80% for 10 min | P2 - High | Slack #alerts |
| RDS Storage Low | < 20% free | P2 - High | Slack #alerts |
| RDS Connections High | > 80% of max | P2 - High | Slack #alerts |
| ECS Task Crashes | Restart count > 3 in 10 min | P1 - Critical | PagerDuty |
| Redis Evictions | Evictions > 0 | P3 - Warning | Slack #infra |
| SSL Certificate Expiry | < 14 days | P3 - Warning | Slack #infra |
| Uptime Check Failed | 2 consecutive failures | P1 - Critical | PagerDuty + Slack |
| Zero Active Listings | listings count = 0 | P2 - High | Slack #alerts |
| Deployment Failed | ECS circuit breaker triggered | P1 - Critical | Slack #deploys |

### 3.5 Structured Logging

Replace `console.log` with structured JSON logging using `pino`:

```javascript
// Log format
{
  "level": "info",
  "timestamp": "2026-03-18T10:30:00.000Z",
  "requestId": "uuid-v4",
  "method": "GET",
  "path": "/api/listings",
  "statusCode": 200,
  "responseTimeMs": 45,
  "userAgent": "Mozilla/5.0...",
  "query": {"brand": "Hyundai"},
  "ip": "x.x.x.x"
}
```

**Log retention:** CloudWatch Logs with 30-day retention (production), 7-day (staging).

### 3.6 Uptime Monitoring

- **UptimeRobot** (free tier: 50 monitors, 5-min intervals):
  - `https://searchanycars.com` (homepage loads)
  - `https://api.searchanycars.com/api/health` (API health)
  - `https://api.searchanycars.com/api/listings?brand=Hyundai` (search works)
- **Status page:** UptimeRobot public status page at `status.searchanycars.com`

---

## 4. Performance Targets & Optimization

### 4.1 Performance Targets

| Metric | Target | Current Baseline | Measurement |
|--------|--------|------------------|-------------|
| Homepage load (4G mobile) | < 3s | Unknown (SPA, no SSR) | Lighthouse / WebPageTest |
| Search API response | < 500ms | ~50ms (SQLite, local) | p95 CloudWatch |
| Listing detail API | < 200ms | ~20ms (SQLite, local) | p95 CloudWatch |
| Time to Interactive | < 4s | ~6s (SPA, full bundle) | Lighthouse |
| Uptime | 99.9% | N/A | UptimeRobot |
| Concurrent users | 10,000+ | ~10 | Load test (k6) |
| Image load time | < 1s on 4G | 2-5s (no optimization) | WebPageTest |
| Core Web Vitals LCP | < 2.5s | ~4s (SPA) | Chrome UX Report |
| Core Web Vitals FID | < 100ms | ~200ms | Chrome UX Report |
| Core Web Vitals CLS | < 0.1 | ~0.2 | Chrome UX Report |

### 4.2 SSR Migration: Vite SPA to Next.js

**Why migrate:** The current Vite SPA (`src/main.tsx` -> client-only React Router) is invisible to search engines. For a car marketplace, SEO is critical -- users search "used Hyundai Creta Delhi" on Google.

**Migration plan (phased, can run in parallel with infrastructure migration):**

1. **Phase A:** Keep Vite SPA, add `react-helmet-async` for meta tags, use `prerender-spa-plugin` for static routes (/, /about, /faq, /how-it-works, /contact)
2. **Phase B:** Migrate to Next.js App Router:
   - `/` -> Server Component (fetch featured listings)
   - `/search` -> Server Component with client-side filter interactivity
   - `/car/[id]` -> Server Component (SEO-critical, fetch listing data server-side)
   - `/admin/*` -> Client Components (`'use client'`)
   - API routes: Move Express endpoints to Next.js API routes or keep separate Express service behind ALB
3. **Phase C:** Incremental Static Regeneration (ISR) for listing detail pages (revalidate: 60s)

**SEO Impact:**
- All listing pages render full HTML with meta tags (title, description, og:image)
- Structured data (JSON-LD) for each car listing
- Sitemap.xml auto-generation from listing database
- robots.txt with crawl directives

### 4.3 Image Optimization Pipeline

```
Upload (Admin)                        User Request
     │                                     │
     ▼                                     ▼
┌──────────┐                        ┌──────────────┐
│  Express  │                        │  CloudFront  │
│  Multer   │                        │  Edge Cache  │──── Cache HIT ──> User
│ (6MB max) │                        └──────┬───────┘
└─────┬─────┘                               │
      │                                Cache MISS
      ▼                                     │
┌──────────┐                        ┌───────▼──────┐
│  Sharp   │                        │  S3 Bucket   │
│  Process │──── Store all ────────>│  /images/    │
│          │     variants           │  /thumb/320  │
│ - WebP   │                        │  /medium/800 │
│ - 3 sizes│                        │  /full/1400  │
│ - Strip  │                        └──────────────┘
│   EXIF   │
│ - 80%    │
│   quality│
└──────────┘
```

**Image URL pattern:** `https://cdn.searchanycars.com/images/thumb/320/{uuid}.webp`

**Savings estimate:** Average car photo ~3MB JPEG -> ~120KB WebP thumbnail, ~400KB medium. 80-95% reduction.

### 4.4 Frontend Performance Optimizations

**Code Splitting (already partially supported by Vite/React Router):**
```
Route-based splitting:
  /admin/*     -> admin-chunk.js     (~80KB, loaded only by admins)
  /search      -> search-chunk.js    (~40KB)
  /car/:id     -> detail-chunk.js    (~35KB)
  /             -> home-chunk.js     (~30KB)
  Common        -> vendor-chunk.js   (~150KB, React + React Router)
```

**Additional optimizations:**
- Lazy load components: `const AdminPage = lazy(() => import('./pages/AdminPage'))`
- `<link rel="preconnect" href="https://cdn.searchanycars.com">` in HTML head
- Preload critical images: Hero car images, first 4 search result thumbnails
- Use `loading="lazy"` on below-fold images (car cards in grid)
- Bundle analyzer: `vite-plugin-visualizer` to identify bloat
- Use `Intersection Observer` for infinite scroll on search results

### 4.5 Service Worker (PWA-lite)

**Scope:** Cache static assets and provide offline fallback page.

```javascript
// Service Worker caching strategy:
// - App shell (HTML, CSS, JS): Cache-first, update in background
// - API responses: Network-first, serve stale if offline
// - Images: Cache-first with 30-day expiry
// - Offline: Show cached search results + "You're offline" banner
```

**Not recommended:** Full offline CRUD. The app is read-heavy and users expect real-time listing data.

---

## 5. Disaster Recovery

### 5.1 Backup Strategy

| Component | Backup Method | Frequency | Retention | RPO |
|-----------|---------------|-----------|-----------|-----|
| RDS PostgreSQL | Automated snapshots | Daily + continuous WAL | 7 days | 5 minutes (PITR) |
| RDS PostgreSQL | Manual snapshot | Pre-deployment | 30 days | N/A |
| S3 Images | Cross-region replication | Real-time | Indefinite | ~15 minutes |
| Redis | RDB snapshots | Every 6 hours | 3 days | 6 hours (acceptable - cache is rebuildable) |
| ECS Task Definitions | Version controlled | Every deploy | All revisions | 0 (in Git) |
| Infrastructure | Terraform state in S3 | On every apply | Versioned bucket | 0 |

### 5.2 Cross-Region Replication

```
Primary Region: ap-south-1 (Mumbai)
DR Region: ap-southeast-1 (Singapore)

┌─────────────────┐         ┌─────────────────┐
│  ap-south-1     │         │  ap-southeast-1  │
│                 │         │                 │
│  S3 Images ─────┼── CRR ─┼──> S3 Images    │
│  (primary)      │         │  (replica)      │
│                 │         │                 │
│  RDS Primary ───┼── (manual snapshot        │
│                 │    copy for DR)            │
│                 │         │                 │
│  ECR Images ────┼── (replicate on demand)   │
└─────────────────┘         └─────────────────┘
```

### 5.3 Recovery Procedures

**RTO Target: 1 hour | RPO Target: 5 minutes**

**Scenario 1: Single ECS task failure**
- Impact: Zero (ALB routes to healthy task)
- Recovery: Automatic (ECS replaces failed task in ~60s)
- RTO: 0 minutes

**Scenario 2: RDS Primary failure**
- Impact: 30s write downtime during Multi-AZ failover
- Recovery: Automatic failover to standby in other AZ
- RTO: ~2 minutes
- RPO: 0 (synchronous replication)

**Scenario 3: Complete AZ failure**
- Impact: Partial capacity loss (50%)
- Recovery: ECS auto-scales in surviving AZ, RDS fails over
- RTO: ~5 minutes

**Scenario 4: Complete region failure**
- Impact: Full outage
- Recovery: Manual DR activation
  1. Restore RDS from cross-region snapshot copy (~30 min)
  2. Deploy ECS service in DR region from ECR replica
  3. Update Route 53 to point to DR region ALB
- RTO: ~60 minutes
- RPO: ~5 minutes (depends on last snapshot copy)

**Scenario 5: Accidental data deletion**
- Recovery: RDS Point-in-Time Recovery to timestamp just before deletion
- RTO: ~15 minutes
- RPO: < 1 minute

### 5.4 Incident Response Runbook Template

```
═══════════════════════════════════════════
INCIDENT RUNBOOK: [Incident Type]
═══════════════════════════════════════════

SEVERITY: P1 / P2 / P3
IMPACT: [Description of user impact]
DETECTION: [How the incident is detected - alert name]

FIRST RESPONDER CHECKLIST:
  [ ] Acknowledge alert in PagerDuty/Slack
  [ ] Check CloudWatch dashboard for scope
  [ ] Identify affected component (API / DB / Cache / CDN)
  [ ] Post update in #incidents Slack channel

DIAGNOSIS STEPS:
  1. Check ECS service events:
     aws ecs describe-services --cluster searchanycars-cluster \
       --services searchanycars-api-prod
  2. Check recent deployments:
     aws ecs describe-task-definition --task-definition searchanycars-api
  3. Check RDS status:
     aws rds describe-db-instances --db-instance-identifier searchanycars-prod
  4. Check application logs:
     aws logs filter-log-events --log-group-name /ecs/searchanycars-api \
       --start-time $(date -d '30 minutes ago' +%s000)
  5. Check ALB target health:
     aws elbv2 describe-target-health --target-group-arn <arn>

MITIGATION:
  - Rollback deployment:
    aws ecs update-service --cluster searchanycars-cluster \
      --service searchanycars-api-prod \
      --task-definition searchanycars-api:<previous-revision>
  - Scale up if load-related:
    aws ecs update-service --desired-count 4
  - Enable maintenance page:
    Update CloudFront to serve S3 maintenance page

RESOLUTION:
  [ ] Root cause identified
  [ ] Fix applied
  [ ] Monitoring confirms resolution
  [ ] Post-incident review scheduled

COMMUNICATION:
  - Internal: #incidents Slack channel
  - External: status.searchanycars.com (if user-facing)
═══════════════════════════════════════════
```

---

## 6. Cost Estimation

### 6.1 Monthly Cost Breakdown (ap-south-1, Mumbai)

All prices in USD based on AWS pricing as of early 2026 for ap-south-1.

| Service | Configuration | Monthly Cost |
|---------|--------------|-------------|
| **ECS Fargate** | 2 tasks x 1 vCPU x 2 GB, 730 hrs | **~$58** |
| | (0.04048/vCPU/hr + 0.004445/GB/hr) x 2 | |
| **RDS PostgreSQL** | db.t3.medium Multi-AZ, 50GB gp3 | **~$138** |
| | ($0.094/hr x 2 instances x 730 hrs + storage) | |
| **ElastiCache Redis** | cache.t3.micro, single node + replica | **~$25** |
| | ($0.017/hr x 2 x 730) | |
| **S3** | 50 GB storage + 500 GB transfer | **~$8** |
| | ($0.025/GB storage + $0.01085/GB transfer) | |
| **CloudFront** | 500 GB transfer, 5M requests | **~$52** |
| | ($0.14/GB India + $0.0120/10K requests) | |
| **ALB** | 1 ALB + ~50 LCU-hours | **~$28** |
| | ($0.027/hr + $0.008/LCU-hr) | |
| **Route 53** | 1 hosted zone + 5M queries | **~$3** |
| **ACM** | SSL certificates | **$0** (free) |
| **SES** | 10,000 emails/month | **~$1** |
| | ($0.10/1000 emails) | |
| **ECR** | ~5 GB image storage | **~$1** |
| **CloudWatch** | Logs (10 GB), 10 dashboards, 20 alarms | **~$15** |
| **NAT Gateway** | 1 NAT GW + 50 GB data processed | **~$40** |
| | ($0.045/hr + $0.045/GB) | |
| **Secrets Manager** | 5 secrets | **~$2** |
| | | |
| **TOTAL** | | **~$371/month** |

### 6.2 Cost Optimization Opportunities

| Optimization | Savings | Trade-off |
|-------------|---------|-----------|
| Use 1 NAT Gateway instead of 2 | -$33/mo | Single point of failure for outbound traffic |
| Fargate Spot for staging env | -50% on staging | Possible interruptions (acceptable for staging) |
| RDS Reserved Instance (1yr) | -35% (~$48/mo saved) | 1-year commitment |
| ElastiCache Reserved Node (1yr) | -30% (~$8/mo saved) | 1-year commitment |
| Use Savings Plans for Fargate | -20% (~$12/mo saved) | 1-year commitment |
| Single AZ for Phase 1 (no Multi-AZ RDS) | -$69/mo | No automatic DB failover |

**Phase 1 "startup mode" budget:** ~$220/month (single NAT GW, no Multi-AZ, no reserved instances)

**Phase 2 "growth mode" budget:** ~$371/month (as estimated above)

**Phase 3 "scale mode" budget:** ~$800-1,200/month (read replicas, larger instances, Elasticsearch)

### 6.3 Cost Comparison with Current Setup

| | Current (Azure App Service) | AWS Phase 1 | AWS Phase 2 |
|---|---|---|---|
| Compute | ~$55/mo (B1 plan) | ~$58 (Fargate) | ~$58 (Fargate) |
| Database | $0 (SQLite on disk) | ~$69 (RDS single-AZ) | ~$138 (Multi-AZ) |
| CDN/Storage | $0 (local disk) | ~$60 (S3+CF) | ~$60 |
| Other | ~$5 | ~$33 | ~$115 |
| **Total** | **~$60/mo** | **~$220/mo** | **~$371/mo** |

The increase is justified by: Multi-AZ reliability, proper database with backups, CDN for India-wide performance, auto-scaling, and production-grade monitoring.

---

## 7. Scaling Strategy

### 7.1 Phase 1: Launch (0 - 1,000 users/month)

**Timeline:** Month 1-3

```
User ──> CloudFront ──> ALB ──> ECS (1 task) ──> RDS (Single-AZ)
                   └──> S3 (images)                └──> No Redis yet
```

**Infrastructure:**
- ECS: 1 Fargate task (1 vCPU, 2 GB)
- RDS: db.t3.micro, Single-AZ, 20 GB
- Redis: None (use in-memory LRU cache in Node.js process)
- S3 + CloudFront for images and static files
- Single NAT Gateway

**Application changes from current codebase:**
1. Replace `better-sqlite3` with `pg` (node-postgres) in `server/db.js`
2. Replace `server/storage.js` local filesystem writes with S3 SDK
3. Add Dockerfile
4. Add health check endpoint improvements (include DB connectivity check)
5. Add `DATABASE_URL` environment variable support
6. Create initial PostgreSQL migration files from current `bootstrap.js` schema

**Estimated cost:** ~$120/month

**Key metrics to watch:**
- API response times (establish baselines)
- Database connection count
- Image upload success rate

---

### 7.2 Phase 2: Growth (1,000 - 10,000 users/month)

**Timeline:** Month 3-12

```
User ──> CloudFront ──> ALB ──> ECS (2-4 tasks) ──> RDS Multi-AZ
                   └──> S3                    └──> ElastiCache Redis
                                              └──> RDS Read Replica
```

**Infrastructure additions:**
- ECS: 2 tasks minimum, auto-scale to 4
- RDS: Upgrade to db.t3.medium, enable Multi-AZ
- RDS Read Replica: 1 replica for search queries (read-heavy workload)
- ElastiCache: cache.t3.micro with replica
- Second NAT Gateway for HA
- CloudWatch dashboards and alarms

**Application changes:**
1. Add Redis caching layer for `/api/listings` and `/api/categories`
2. Implement connection pooling (pgBouncer sidecar or RDS Proxy)
3. Route read queries (search, detail) to read replica
4. Add response compression (already in Express, ensure gzip/brotli)
5. Implement rate limiting with Redis (`express-rate-limit` + `rate-limit-redis`)
6. Add request ID tracking for distributed tracing
7. Begin Next.js migration for SEO

**Database optimizations:**
- Add composite indexes based on actual query patterns:
  ```sql
  CREATE INDEX idx_listings_search ON listings(listing_status, brand, fuel_type, location_city);
  CREATE INDEX idx_listings_price_year ON listings(listing_price_inr, model_year) WHERE listing_status = 'Active';
  ```
- Convert `LIKE '%city%'` to PostgreSQL full-text search
- Add query plan analysis for slow queries (pg_stat_statements)

**Estimated cost:** ~$371/month

---

### 7.3 Phase 3: Scale (10,000 - 100,000 users/month)

**Timeline:** Month 12-24

```
                                    ┌──> Elasticsearch (search)
User ──> CloudFront ──> ALB ──> ECS ├──> RDS Primary (writes)
                   │           (4-8  ├──> RDS Replica 1 (reads)
                   │           tasks)├──> RDS Replica 2 (reads)
                   └──> S3          └──> ElastiCache Redis Cluster
                                         (3 shards)
```

**Infrastructure additions:**
- ECS: 4-8 tasks, consider spot instances for non-critical tasks
- RDS: Upgrade to db.r6g.large, 2 read replicas
- ElastiCache: Upgrade to cache.t3.medium, cluster mode enabled
- Elasticsearch: Managed OpenSearch for listing search
- Consider RDS Proxy for connection pooling at scale
- Multi-region CDN with Lambda@Edge for geo-routing

**Application architecture evolution:**

Consider splitting the monolithic `server/index.js` into focused services only if team size and codebase complexity justify it:

| Service | Responsibility | Communication |
|---------|---------------|---------------|
| API Gateway | Auth, rate limit, routing | ALB path-based routing |
| Listing Service | CRUD for listings, search | REST/gRPC |
| Image Service | Upload, resize, optimize | Async (SQS) |
| Notification Service | Email, SMS, push | Async (SQS + SES/MSG91) |
| Analytics Service | Views, leads, metrics | Async (Kinesis/SQS) |

**Important:** Do not split prematurely. The current monolith in `server/index.js` is ~530 lines. It can handle 100K users easily as a monolith with proper caching and database optimization. Split only when:
- Team grows to 5+ backend engineers
- Deploy frequency needs differ between components
- A single component needs independent scaling

**Elasticsearch integration for search:**
```
Current: SELECT * FROM listings WHERE brand LIKE '%hyundai%' AND location_city LIKE '%delhi%'
Future:  POST /listings/_search { "query": { "bool": { "must": [
           { "match": { "brand": "hyundai" } },
           { "match": { "location_city": "delhi" } }
         ]}}}
```

Benefits: Fuzzy matching ("hundai" -> "hyundai"), faceted search (count by brand/city/price range), relevance scoring, autocomplete suggestions.

**Database sharding considerations for multi-city:**

At 100K+ users, the listings table may reach millions of rows. Sharding options:

| Strategy | Implementation | When to Use |
|----------|---------------|-------------|
| No sharding | Optimize indexes + read replicas | < 10M listings |
| Logical partitioning | PostgreSQL table partitioning by `location_state` | 10M-100M listings |
| Application-level sharding | Route by city/region to different DB instances | 100M+ listings |
| Citus (distributed PG) | Transparent sharding on `location_state` | 100M+ listings, need joins |

**Recommendation:** PostgreSQL native partitioning by `location_state` is sufficient for the Indian market (28 states + 8 UTs). Each partition can be independently indexed and vacuumed. This avoids application-level complexity.

```sql
CREATE TABLE listings (
  id BIGSERIAL,
  location_state TEXT NOT NULL,
  ...
) PARTITION BY LIST (location_state);

CREATE TABLE listings_maharashtra PARTITION OF listings FOR VALUES IN ('Maharashtra');
CREATE TABLE listings_delhi PARTITION OF listings FOR VALUES IN ('Delhi');
CREATE TABLE listings_karnataka PARTITION OF listings FOR VALUES IN ('Karnataka');
-- ... one per state
```

**Estimated cost:** ~$800-1,200/month

---

## Appendix A: Migration Checklist (Current State to Phase 1)

```
PRE-MIGRATION:
  [ ] Set up AWS account with billing alerts ($500/mo threshold)
  [ ] Create IAM roles (deploy, app, migrate)
  [ ] Provision VPC with Terraform/CloudFormation
  [ ] Create RDS instance and run initial migrations
  [ ] Create S3 buckets and CloudFront distributions
  [ ] Create ECR repository
  [ ] Set up GitHub OIDC for AWS authentication

CODE CHANGES:
  [ ] Replace better-sqlite3 with pg in server/db.js
  [ ] Convert bootstrap.js schema to node-pg-migrate migrations
  [ ] Replace server/storage.js filesystem writes with S3 SDK
  [ ] Update server/index.js SQL queries for PostgreSQL syntax
  [ ] Convert integer booleans to actual booleans
  [ ] Convert TEXT JSON columns to JSONB
  [ ] Replace LIKE searches with full-text search where appropriate
  [ ] Add structured logging (pino)
  [ ] Add Sentry error tracking
  [ ] Add health check with DB/Redis connectivity
  [ ] Update src/api/client.ts API_BASE for new domain
  [ ] Create Dockerfile and .dockerignore
  [ ] Create docker-compose.yml for local development

CI/CD:
  [ ] Create .github/workflows/deploy-aws.yml
  [ ] Create GitHub environments (staging, production)
  [ ] Configure environment protection rules (manual approval for prod)
  [ ] Set up GitHub secrets for AWS credentials
  [ ] Test full pipeline: push -> build -> test -> deploy staging

DNS & SSL:
  [ ] Create Route 53 hosted zone
  [ ] Update domain registrar nameservers to Route 53
  [ ] Request ACM certificate for *.searchanycars.com
  [ ] Validate certificate via DNS
  [ ] Configure ALB listener with certificate
  [ ] Configure CloudFront with certificate

VALIDATION:
  [ ] Smoke test all API endpoints on staging
  [ ] Verify image upload -> S3 -> CloudFront flow
  [ ] Load test with k6 (1000 concurrent users)
  [ ] Verify database migration data integrity
  [ ] Test rollback procedure
  [ ] Verify monitoring dashboards and alerts fire correctly

GO-LIVE:
  [ ] Run final data migration from SQLite to PostgreSQL
  [ ] Switch DNS from Azure to AWS (low TTL first: 60s)
  [ ] Monitor error rates for 1 hour post-switch
  [ ] Increase DNS TTL to 3600s after confirming stability
  [ ] Decommission Azure App Service after 1 week (keep as fallback)
```

## Appendix B: Environment Variables (Target)

```bash
# Application
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://searchanycars_app:***@searchanycars-prod.xxxxx.ap-south-1.rds.amazonaws.com:5432/searchanycars
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=rediss://searchanycars-redis.xxxxx.cache.amazonaws.com:6379

# AWS S3
AWS_S3_BUCKET=searchanycars-images-prod
AWS_S3_REGION=ap-south-1
CDN_BASE_URL=https://cdn.searchanycars.com

# Image Processing
MAX_IMAGE_SIZE_BYTES=6291456
IMAGE_QUALITY=80
IMAGE_FORMATS=webp,jpg

# CORS
CORS_ORIGINS=https://searchanycars.com,https://www.searchanycars.com

# Email (SES)
SES_FROM_EMAIL=noreply@searchanycars.com
SES_REGION=ap-south-1

# SMS (MSG91)
MSG91_AUTH_KEY=***
MSG91_SENDER_ID=SRCHCR

# Monitoring
SENTRY_DSN=https://***@sentry.io/***
LOG_LEVEL=info

# Secrets (stored in AWS Secrets Manager, injected by ECS task definition)
# DATABASE_URL, REDIS_URL, MSG91_AUTH_KEY, SENTRY_DSN
```

## Appendix C: Key File Changes Summary

| Current File | Change Required | Priority |
|-------------|----------------|----------|
| `server/db.js` | Replace `better-sqlite3` with `pg` pool | P0 - Blocking |
| `server/bootstrap.js` | Convert to migration files, remove seed-on-boot | P0 - Blocking |
| `server/storage.js` | Replace filesystem with S3 SDK | P0 - Blocking |
| `server/index.js` | Update SQL syntax, add caching, structured logging | P0 - Blocking |
| `package.json` | Add `pg`, `@aws-sdk/client-s3`, `sharp`, `pino`, `ioredis` | P0 - Blocking |
| `vite.config.ts` | No change needed (build output stays in `dist/`) | N/A |
| `src/api/client.ts` | Update `API_BASE` for production domain | P1 - Important |
| (new) `Dockerfile` | Create multi-stage build | P0 - Blocking |
| (new) `.dockerignore` | Exclude node_modules, .git, uploads, *.db | P0 - Blocking |
| (new) `migrations/` | PostgreSQL migration files | P0 - Blocking |
| (new) `docker-compose.yml` | Local dev with PostgreSQL + Redis containers | P1 - Important |
| (new) `.github/workflows/deploy-aws.yml` | Full CI/CD pipeline | P0 - Blocking |
