# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

## Production Setup

### 1. Environment Configuration

Create `.env.production` in the project root:

```env
# Database
DATABASE_URL=postgresql://ebeef:secure_password@postgres:5432/ebeef

# Authentication
JWT_SECRET=your-very-secure-secret-key-at-least-32-characters
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=12

# WhatsApp Integration
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_APP_SECRET=your_app_secret

# OpenAI (optional)
OPENAI_API_KEY=your_openai_api_key

# Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx

# Server
APP_MODE=production
PORT=3001

# Client
VITE_API_URL=https://api.yourdomain.com
```

### 2. HTTPS/TLS Configuration

#### Option A: Using Nginx Reverse Proxy (Recommended)

Create `nginx/nginx.conf`:

```nginx
upstream server {
    server server:3001;
}

upstream client {
    server client:80;
}

server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://client;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_read_timeout 86400;
    }

    # WhatsApp webhook
    location /webhook {
        proxy_pass http://server;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Option B: Using Cloudflare

1. Add your domain to Cloudflare
2. Set SSL/TLS mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Configure origin server to accept Cloudflare IPs

### 3. Let's Encrypt SSL Certificate

```bash
# Install certbot
apt-get update && apt-get install certbot

# Generate certificate
certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com \
  -d api.yourdomain.com

# Auto-renewal (add to crontab)
0 0 1 * * certbot renew --quiet && docker-compose restart nginx
```

### 4. Database Setup

```bash
# Start only the database first
docker-compose -f docker-compose.production.yml up -d postgres

# Wait for PostgreSQL to be ready
sleep 10

# Run migrations
docker-compose -f docker-compose.production.yml exec server npx prisma migrate deploy

# Seed initial data (optional)
docker-compose -f docker-compose.production.yml exec server npm run db:seed
```

### 5. Deploy

```bash
# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check logs
docker-compose -f docker-compose.production.yml logs -f
```

## Monitoring

### Health Checks

- **Basic:** `https://api.yourdomain.com/health`
- **Detailed:** `https://api.yourdomain.com/health/detailed`
- **Readiness:** `https://api.yourdomain.com/ready`
- **Liveness:** `https://api.yourdomain.com/live`

### Metrics Endpoint

```bash
curl https://api.yourdomain.com/metrics
```

Returns:
- Memory usage
- Active connections
- Request counts
- Response times
- Database connection pool stats

### Log Aggregation

Logs are in JSON format (Pino). Recommended tools:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **CloudWatch Logs**

Example Loki configuration:

```yaml
# promtail-config.yml
clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: ebeef
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.production.yml
services:
  server:
    deploy:
      replicas: 3
```

### Load Balancer Configuration

For multiple server instances, use sticky sessions for WebSocket:

```nginx
upstream server {
    ip_hash;  # Sticky sessions for WebSocket
    server server1:3001;
    server server2:3001;
    server server3:3001;
}
```

## Backup & Recovery

### Automated Backups

Daily backups run at 3 AM UTC via GitHub Actions.

Manual backup:
```bash
./scripts/backup.sh /backups
```

### Restore

```bash
./scripts/restore.sh /backups/ebeef_backup_YYYYMMDD_HHMMSS.sql.gz
```

## Troubleshooting

### Common Issues

1. **Database connection refused**
   - Check PostgreSQL is running: `docker-compose ps postgres`
   - Verify DATABASE_URL in .env.production

2. **WebSocket not connecting**
   - Check nginx proxy_read_timeout is set high enough
   - Verify WebSocket upgrade headers in nginx config

3. **WhatsApp webhook not receiving messages**
   - Verify WHATSAPP_VERIFY_TOKEN matches Meta app settings
   - Check webhook URL is publicly accessible
   - Verify SSL certificate is valid

4. **High memory usage**
   - Check for memory leaks with `/health/detailed`
   - Consider increasing `--max-old-space-size` in node command

### Log Analysis

```bash
# Server logs
docker-compose logs -f server

# Filter errors
docker-compose logs server | grep '"level":50'

# Filter by request ID
docker-compose logs server | grep 'request-id-here'
```
