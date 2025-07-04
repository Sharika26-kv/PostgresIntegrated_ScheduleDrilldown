# PostgreSQL Migration Dependencies

## 1. Node.js Dependencies
Add to your package.json:
```bash
npm install pg
# Remove sqlite3 if no longer needed:
# npm uninstall sqlite3
```

## 2. Python Dependencies
Add to your requirements.txt:
```
psycopg2-binary==2.9.7
# Remove sqlite dependencies if no longer needed
```

## 3. Environment Variables (.env file)
**IMPORTANT**: Add these lines to your EXISTING .env file (don't replace the file):

```env
# ====================================================================
# POSTGRESQL DATABASE CONFIGURATION (ADD THESE LINES TO YOUR .env)
# ====================================================================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=nirman
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Qazwsxedc_123
POSTGRES_SSL=false
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=5000
```

**Note**: Keep ALL your existing API keys and configurations. Only ADD the PostgreSQL variables above.

## 4. Cloud Deployment Variables (for later)
When deploying to cloud, override with:
- POSTGRES_HOST=your-cloud-database-host
- POSTGRES_SSL=true
- POSTGRES_USER=cloud_username
- POSTGRES_PASSWORD=cloud_password
- etc.

## 5. Installation Commands
```bash
# Node.js
npm install pg

# Python
pip install psycopg2-binary

# Optional: for development
npm install --save-dev nodemon
``` 