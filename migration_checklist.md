# SQLite to PostgreSQL Migration Checklist

## Phase 1: Setup and Configuration ✅

### 1.1 Install Dependencies
- [ ] Run `npm install pg` for Node.js
- [ ] Run `pip install psycopg2-binary` for Python
- [ ] Remove SQLite dependencies: `npm uninstall sqlite3` (if desired)

### 1.2 Add Environment Variables
- [ ] Add PostgreSQL variables to your existing `.env` file:
  ```env
  POSTGRES_HOST=localhost
  POSTGRES_PORT=5432
  POSTGRES_DB=your_database_name
  POSTGRES_USER=your_username
  POSTGRES_PASSWORD=your_password
  POSTGRES_SSL=false
  POSTGRES_MAX_CONNECTIONS=20
  POSTGRES_IDLE_TIMEOUT=30000
  POSTGRES_CONNECTION_TIMEOUT=5000
  ```
- [ ] **Verify**: Your existing API keys and configurations remain unchanged

### 1.3 Database Configuration
- [ ] Create `config/database.js` (Node.js configuration)
- [ ] Create `config/database.py` (Python configuration)
- [ ] Test database connection: `node -e "require('./config/database').healthCheck()"`

## Phase 2: Code Migration 🔄

### 2.1 Find All Database Files
Search for files containing database code:
```bash
# Find files with SQLite references
grep -r "sqlite3\|\.db\|Database" --include="*.js" --include="*.py" .

# Find files with SQL queries  
grep -r "SELECT\|INSERT\|UPDATE\|DELETE" --include="*.js" --include="*.py" .
```

### 2.2 Update Import Statements

#### Node.js Files
- [ ] Replace: `const sqlite3 = require('sqlite3')` → `const db = require('./config/database')`
- [ ] Replace: `const Database = require('better-sqlite3')` → `const db = require('./config/database')`
- [ ] Remove: Database file path references (`'database/primavera_p6.db'`)

#### Python Files  
- [ ] Replace: `import sqlite3` → `from config.database import execute_query, execute_query_dict`
- [ ] Remove: Connection management code (`sqlite3.connect()`, `conn.close()`)

### 2.3 Update Query Execution Patterns

#### Node.js Query Updates
- [ ] Replace callback pattern with async/await:
  ```javascript
  // BEFORE
  db.all(query, params, (err, rows) => { ... });
  
  // AFTER
  const result = await db.query(query, params);
  ```

#### Python Query Updates
- [ ] Replace cursor execution with function calls:
  ```python
  # BEFORE
  cursor.execute(query, params)
  rows = cursor.fetchall()
  
  # AFTER
  rows = execute_query_dict(query, params)
  ```

## Phase 3: SQL Query Migration 📝

### 3.1 Parameter Binding
- [ ] Replace `?` with `$1`, `$2`, `$3`, etc. in Node.js
- [ ] Use `%s` parameter style in Python (psycopg2 format)

### 3.2 Table and Column Names
- [ ] Update table names to lowercase: `TASK` → `task`, `PROJECT` → `project`
- [ ] Update column names if needed (check your PostgreSQL schema)

### 3.3 Replace Recursive Queries with Views
Search for these patterns and replace with view queries:

- [ ] **AWP Hierarchy**: Replace recursive CTEs with `SELECT * FROM awp_hierarchy_view WHERE project_id = $1`
- [ ] **Activity Relationships**: Use `activity_relationship_view`
- [ ] **WBS Structure**: Use `wbs_structure` view
- [ ] **Final Activity KPI**: Use `final_activity_kpi_view`

### 3.4 PostgreSQL-Specific Syntax
- [ ] Date functions: `strftime()` → `TO_CHAR()`
- [ ] Type casting: Add `CAST(column AS REAL)` for numeric operations
- [ ] String functions: Update any SQLite-specific functions

## Phase 4: API Endpoint Testing 🧪

### 4.1 Schedule Endpoints
- [ ] `/api/schedule/projects` - Project list
- [ ] `/api/schedule/leads-kpi` - Leads KPI data
- [ ] `/api/schedule/leads-chart-data` - Chart data
- [ ] `/api/schedule/leads-percentage-history` - History data
- [ ] `/api/schedule/leads` - Leads detail
- [ ] `/api/schedule/lags-kpi` - Lags KPI
- [ ] `/api/schedule/lags-chart-data` - Lags chart
- [ ] `/api/schedule/excessive-lags-kpi` - Excessive lags
- [ ] `/api/schedule/fs-kpi` - FS relationships
- [ ] `/api/schedule/non-fs-kpi` - Non-FS relationships

### 4.2 AWP Endpoints
- [ ] `/api/awp/projects/:projectId/hierarchy` - AWP hierarchy
- [ ] `/api/awp/projects/:projectId/tasks` - AWP tasks
- [ ] `/api/awp/projects/:projectId/predecessors` - Task predecessors

### 4.3 Gantt Endpoints
- [ ] `/api/gantt/projects` - Gantt projects
- [ ] `/api/gantt/tasks` - Gantt tasks
- [ ] `/api/gantt/statuses` - Task statuses

### 4.4 General Endpoints
- [ ] `/api/projects` - Projects list
- [ ] `/api/progress-data` - Progress data
- [ ] `/api/database/tables` - Table list
- [ ] `/api/database/table/TASK` - Task data
- [ ] `/api/database/table/PROJWBS` - WBS data
- [ ] `/api/health` - Health check

## Phase 5: Error Handling and Optimization 🛠️

### 5.1 Error Handling
- [ ] Add try-catch blocks around all database operations
- [ ] Implement proper error messages
- [ ] Test error scenarios (invalid project IDs, connection failures)

### 5.2 Performance Testing
- [ ] Test with actual data loads
- [ ] Monitor connection pool usage
- [ ] Verify query performance vs SQLite

### 5.3 Graceful Shutdown
- [ ] Add shutdown handlers for connection pool cleanup
- [ ] Test application restart scenarios

## Phase 6: Final Verification ✔️

### 6.1 Data Integrity
- [ ] Compare API responses between SQLite and PostgreSQL
- [ ] Verify all 35 endpoints return expected data
- [ ] Test with different project IDs

### 6.2 Clean Up
- [ ] Remove SQLite database files (after backup)
- [ ] Remove unused SQLite code
- [ ] Update documentation

### 6.3 Production Readiness
- [ ] Test with cloud PostgreSQL connection
- [ ] Verify SSL connections work
- [ ] Test environment variable overrides
- [ ] Document deployment process

## Troubleshooting Common Issues 🔧

### Connection Issues
- Check environment variables are loaded correctly
- Verify PostgreSQL service is running
- Test connection with `psql` command

### Query Errors
- Verify parameter binding syntax ($1 vs ?)
- Check table/column name case sensitivity
- Ensure views exist in PostgreSQL

### Performance Issues
- Monitor connection pool usage
- Check for missing indexes
- Compare query execution plans

## Success Criteria ✅
- [ ] All 35 API endpoints work with PostgreSQL
- [ ] No SQLite references remain in code
- [ ] Connection pooling is active
- [ ] Error handling is robust
- [ ] Performance is acceptable
- [ ] Code is ready for cloud deployment
- [ ] **Existing functionality remains unchanged**

## Emergency Rollback Plan 🔄
If issues arise:
1. Revert database connection imports
2. Restore SQLite query syntax
3. Test with original SQLite database
4. Investigate and fix issues
5. Re-attempt migration 