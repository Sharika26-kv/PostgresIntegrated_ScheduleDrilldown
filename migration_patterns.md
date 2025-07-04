# SQLite to PostgreSQL Migration Patterns

## 1. Import/Require Changes

### Node.js
**BEFORE (SQLite):**
```javascript
const sqlite3 = require('sqlite3').verbose();
const Database = require('better-sqlite3');
const db = new sqlite3.Database('database/primavera_p6.db');
```

**AFTER (PostgreSQL):**
```javascript
const db = require('./config/database.js');
// No need to create connection - it's handled by the pool
```

### Python
**BEFORE (SQLite):**
```python
import sqlite3
conn = sqlite3.connect('database/primavera_p6.db')
cursor = conn.cursor()
```

**AFTER (PostgreSQL):**
```python
from config.database import execute_query, execute_query_dict
# No need to manage connections - handled by the pool
```

## 2. Query Execution Changes

### Node.js Query Pattern
**BEFORE (SQLite):**
```javascript
db.all("SELECT * FROM TASK WHERE proj_id = ?", [projectId], (err, rows) => {
    if (err) throw err;
    res.json(rows);
});
```

**AFTER (PostgreSQL):**
```javascript
try {
    const result = await db.query("SELECT * FROM task WHERE proj_id = $1", [projectId]);
    res.json(result.rows);
} catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
}
```

### Python Query Pattern
**BEFORE (SQLite):**
```python
cursor.execute("SELECT * FROM TASK WHERE proj_id = ?", (project_id,))
rows = cursor.fetchall()
```

**AFTER (PostgreSQL):**
```python
result = execute_query_dict("SELECT * FROM task WHERE proj_id = %s", (project_id,))
rows = result  # Already formatted as dict
```

## 3. Recursive Query Replacements

### Complex Recursive Query → Simple View Query
**BEFORE (Complex recursive CTE):**
```sql
WITH RECURSIVE ActivityHierarchy AS (
    SELECT actv_code_id, actv_code_type_id, actv_code_name, short_name, parent_actv_code_id, 0 as level
    FROM ACTVCODE a WHERE nullif(parent_actv_code_id,'') IS NULL
    UNION ALL
    SELECT c.actv_code_id, c.actv_code_type_id, c.actv_code_name, c.short_name, c.parent_actv_code_id, p.level + 1
    FROM ACTVCODE c INNER JOIN ActivityHierarchy p ON c.parent_actv_code_id = p.actv_code_id
)
SELECT * FROM ActivityHierarchy h
LEFT JOIN ACTVTYPE at ON h.actv_code_type_id = at.actv_code_type_id
WHERE at.actv_code_type LIKE '%AWP%'
ORDER BY hierarchy_path
```

**AFTER (Simple view query):**
```sql
SELECT * FROM awp_hierarchy_view WHERE project_id = $1
```

## 4. Parameter Binding Changes

### Search and Replace Patterns:
- `?` → `$1`, `$2`, `$3`, etc. (PostgreSQL uses numbered parameters)
- Table names: `TASK` → `task`, `PROJECT` → `project`, etc.
- Column names: Follow PostgreSQL naming (usually lowercase)

**Examples:**
```sql
-- BEFORE
SELECT * FROM TASK WHERE proj_id = ? AND status_code = ?

-- AFTER  
SELECT * FROM task WHERE proj_id = $1 AND status_code = $2
```

## 5. API Endpoint Migration Examples

### Node.js API Endpoint
**BEFORE:**
```javascript
app.get('/api/schedule/projects', (req, res) => {
    const query = `SELECT DISTINCT Project_ID as id, Project_ID as name 
                   FROM ActivityRelationshipView ORDER BY Project_ID`;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
```

**AFTER:**
```javascript
app.get('/api/schedule/projects', async (req, res) => {
    try {
        const query = `SELECT DISTINCT project_id as id, project_id as name 
                       FROM activity_relationship_view ORDER BY project_id`;
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
```

### Python API Endpoint
**BEFORE:**
```python
@app.route('/api/tasks/<project_id>')
def get_tasks(project_id):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM TASK WHERE proj_id = ?", (project_id,))
    rows = cursor.fetchall()
    conn.close()
    return jsonify(rows)
```

**AFTER:**
```python
@app.route('/api/tasks/<project_id>')
def get_tasks(project_id):
    try:
        rows = execute_query_dict("SELECT * FROM task WHERE proj_id = %s", (project_id,))
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

## 6. View-Based Query Patterns

### Schedule Endpoints
```javascript
// Leads KPI
const result = await db.query(`
    SELECT COUNT(*) as leads_count 
    FROM activity_relationship_view 
    WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) < 0 
    AND project_id = $1
`, [projectId]);

// Progress Data
const result = await db.query(`
    SELECT 
        TO_CHAR(act_start_date::DATE, 'YYYY-MM') as period,
        AVG(CAST(phys_complete_pct AS REAL)) as actual,
        COUNT(*) as task_count
    FROM task 
    WHERE proj_id = $1
    GROUP BY TO_CHAR(act_start_date::DATE, 'YYYY-MM')
    ORDER BY period
`, [projectId]);
```

## 7. Error Handling Updates

### Enhanced Error Handling
```javascript
// Wrap database operations in try-catch
try {
    const result = await db.query(query, params);
    return result.rows;
} catch (error) {
    console.error('Database error:', error);
    throw new Error(`Database operation failed: ${error.message}`);
}
```

## 8. Connection Management

### Node.js - No Manual Connection Management
```javascript
// BEFORE (SQLite) - Manual connection handling
const db = new sqlite3.Database('database.db');
// ... queries
db.close();

// AFTER (PostgreSQL) - Automatic pool management
const result = await db.query(query, params);
// Connection automatically returned to pool
```

## 9. Health Check Implementation

### Node.js Health Check
```javascript
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.healthCheck();
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});
```

## 10. Graceful Shutdown

### Add to your app shutdown
```javascript
// Node.js
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await db.close();
    process.exit(0);
});
```

```python
# Python
import atexit
from config.database import close_all_connections

atexit.register(close_all_connections)
``` 