# SQLite to PostgreSQL Migration - API Endpoints and SQL Queries

This document organizes all API endpoints and their SQL queries by the HTML pages that consume them. Each entry includes the current SQLite query and a placeholder for the PostgreSQL equivalent.

## 1. Schedule Drilldown Page

**Page:** `schedule-drilldown.html`

### 1.1 Schedule Projects
**Endpoint:** `GET /api/schedule/projects`
**Query (SQLite):**
```sql
SELECT DISTINCT 
    Project_ID as id, 
    Project_ID as name
FROM ActivityRelationshipView 
ORDER BY Project_ID
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.2 Leads KPI
**Endpoint:** `GET /api/schedule/leads-kpi`
**Query (SQLite):**
```sql
-- Leads count
SELECT COUNT(*) as leads_count 
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' AND Lag < 0 [AND Project_ID = ?];

-- Remaining relationships count
SELECT COUNT(*) as remaining_count 
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' [AND Project_ID = ?];

-- Total relationships count
SELECT COUNT(*) as total_count 
FROM ActivityRelationshipView 
[WHERE Project_ID = ?]
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.3 Leads Chart Data
**Endpoint:** `GET /api/schedule/leads-chart-data`
**Query (SQLite):**
```sql
SELECT 
    Lag as lag,
    RelationshipType as relationship_type,
    COUNT(*) as count
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' AND Lag < 0 [AND Project_ID = ?]
GROUP BY Lag, RelationshipType
ORDER BY Lag, RelationshipType
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.4 Leads Percentage History
**Endpoint:** `GET /api/schedule/leads-percentage-history`
**Query (SQLite):**
```sql
SELECT
    strftime('%Y-%m', p.last_recalc_date) as date,
    AVG(f.Relationship_Percentage) as percentage
FROM FinalActivityKPIView f
INNER JOIN Project p ON f.Project_ID = p.proj_id
INNER JOIN ActivityRelationshipView a ON f.Project_ID = a.Project_ID
WHERE f.Relationship_Percentage IS NOT NULL AND a.Lag < 0 [AND f.Project_ID = ?]
GROUP BY strftime('%Y-%m', p.last_recalc_date)
ORDER BY date
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.5 Leads Detail
**Endpoint:** `GET /api/schedule/leads`
**Query (SQLite):**
```sql
SELECT *
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' AND Lag < 0 [AND Project_ID = ?]
ORDER BY Lag, RelationshipType
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.6 Lags KPI
**Endpoint:** `GET /api/schedule/lags-kpi`
**Query (SQLite):**
```sql
SELECT COUNT(*) as lags_count 
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' AND Lag > 0 [AND Project_ID = ?]
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.7 Lags Chart Data
**Endpoint:** `GET /api/schedule/lags-chart-data`
**Query (SQLite):**
```sql
SELECT 
    Lag as lag,
    RelationshipType as relationship_type,
    COUNT(*) as count
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' AND Lag > 0 [AND Project_ID = ?]
GROUP BY Lag, RelationshipType
ORDER BY Lag, RelationshipType
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.8 Excessive Lags KPI
**Endpoint:** `GET /api/schedule/excessive-lags-kpi`
**Query (SQLite):**
```sql
SELECT COUNT(*) as excessive_lags_count 
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' AND Lag > 40 [AND Project_ID = ?]
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.9 FS (Finish-to-Start) KPI
**Endpoint:** `GET /api/schedule/fs-kpi`
**Query (SQLite):**
```sql
SELECT COUNT(*) as fs_count 
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' AND RelationshipType = 'FS' [AND Project_ID = ?]
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 1.10 Non-FS KPI
**Endpoint:** `GET /api/schedule/non-fs-kpi`
**Query (SQLite):**
```sql
SELECT COUNT(*) as non_fs_count 
FROM ActivityRelationshipView 
WHERE Relationship_Status = 'Incomplete' AND RelationshipType != 'FS' [AND Project_ID = ?]
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## 2. Schedule AWP Fresh Page

**Page:** `schedule_awp_fresh.html`

### 2.1 Gantt Projects
**Endpoint:** `GET /api/gantt/projects`
**Query (SQLite):**
```sql
SELECT 
    proj_id,
    proj_short_name,
    proj_short_name as proj_name,
    plan_start_date,
    plan_end_date,
    last_recalc_date as data_date
FROM PROJECT 
ORDER BY proj_short_name
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 2.2 AWP Hierarchy
**Endpoint:** `GET /api/awp/projects/:projectId/hierarchy`
**Query (SQLite):**
```sql
WITH RECURSIVE ActivityHierarchy AS (
    SELECT
        actv_code_id,
        actv_code_type_id,
        actv_code_name,
        short_name,
        parent_actv_code_id,
        0 as level,
        CAST(short_name AS VARCHAR(1000)) as hierarchy_path
    FROM ACTVCODE a
    WHERE nullif(parent_actv_code_id,'') IS NULL

    UNION ALL

    SELECT
        c.actv_code_id,
        c.actv_code_type_id,
        c.actv_code_name,
        c.short_name,
        c.parent_actv_code_id,
        p.level + 1,
        CAST(p.hierarchy_path || ' > ' || c.short_name AS VARCHAR(1000))
    FROM ACTVCODE c
    INNER JOIN ActivityHierarchy p ON c.parent_actv_code_id = p.actv_code_id
)
SELECT *
FROM ActivityHierarchy h
LEFT JOIN ACTVTYPE at ON h.actv_code_type_id = at.actv_code_type_id
WHERE at.actv_code_type LIKE '%AWP%'
ORDER BY hierarchy_path
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 2.3 AWP Tasks
**Endpoint:** `GET /api/awp/projects/:projectId/tasks`
**Query (SQLite):**
```sql
SELECT 
    t.*,
    ta.actv_code_id,
    ac.short_name as awp_code,
    ac.actv_code_name as awp_name,
    at.actv_code_type
FROM TASK t
LEFT JOIN TASKACTV ta ON t.task_id = ta.task_id AND t.proj_id = ta.proj_id
LEFT JOIN ACTVCODE ac ON ta.actv_code_id = ac.actv_code_id
LEFT JOIN ACTVTYPE at ON ac.actv_code_type_id = at.actv_code_type_id
WHERE t.proj_id = ?
AND at.actv_code_type LIKE '%AWP%'
ORDER BY t.task_code
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 2.4 AWP Dependencies
**Endpoint:** `GET /api/awp/projects/:projectId/dependencies`
**Query (SQLite):**
```sql
SELECT 
    tp.task_pred_id,
    tp.task_id AS successor_id,
    tp.pred_task_id AS predecessor_id,
    tp.pred_type,
    tp.lag_hr_cnt,
    t1.task_code AS successor_code,
    t1.task_name AS successor_name,
    t2.task_code AS predecessor_code,
    t2.task_name AS predecessor_name
FROM TASKPRED tp
LEFT JOIN TASK t1 ON tp.task_id = t1.task_id AND tp.proj_id = t1.proj_id
LEFT JOIN TASK t2 ON tp.pred_task_id = t2.task_id AND tp.proj_id = t2.proj_id
WHERE tp.proj_id = ?
ORDER BY tp.task_id, tp.pred_task_id
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## 3. Schedule Page

**Page:** `schedule.html`

### 3.1 Hierarchical Gantt
**Endpoint:** `GET /api/hierarchical-gantt`
**Query (SQLite):**
```sql
WITH RECURSIVE WBStructure (wbs_id, parent_wbs_id, wbs_name, level, path) AS (
    -- Anchor member: Select top-level WBS elements for Project
    SELECT
        p.wbs_id,
        p.parent_wbs_id,
        p.wbs_name,
        0 AS level,
        CAST(p.wbs_name AS TEXT) AS path
    FROM PROJWBS p
    WHERE p.proj_id = ? AND (
        p.parent_wbs_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM PROJWBS parent WHERE parent.wbs_id = p.parent_wbs_id)
    )

    UNION ALL

    -- Recursive member: Select children WBS elements within Project
    SELECT
        p_child.wbs_id,
        p_child.parent_wbs_id,
        p_child.wbs_name,
        cte.level + 1,
        cte.path || ' > ' || p_child.wbs_name
    FROM PROJWBS p_child
    INNER JOIN WBStructure cte ON p_child.parent_wbs_id = cte.wbs_id
    WHERE p_child.proj_id = ?
)
-- Final selection joining WBS hierarchy with TASK data
SELECT
    -- Task details
    t.task_id,
    t.task_name,
    -- Use CASE statements for date logic based on status_code
    CASE
        WHEN t.status_code IN ('TK_Complete','TK_Active') THEN t.act_start_date
        ELSE t.target_start_date
    END AS start_date,
    CASE
        WHEN t.status_code IN ('TK_NotStart','TK_Active') THEN t.target_end_date
        ELSE t.act_end_date
    END AS end_date,
    t.status_code,
    t.driving_path_flag,
    t.target_drtn_hr_cnt,
    t.task_code,

    -- WBS Hierarchy details from CTE
    wbs.wbs_id AS task_wbs_id,
    wbs.level AS wbs_level,
    wbs.path AS wbs_path,
    substr('                                                  ', 1, wbs.level * 2) || wbs.wbs_name AS indented_wbs_name

FROM TASK t
INNER JOIN WBStructure wbs ON t.wbs_id = wbs.wbs_id
WHERE t.proj_id = ?
ORDER BY wbs.path, start_date
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 3.2 Float Analysis Tasks
**Endpoint:** `GET /api/float-analysis-tasks`
**Query (SQLite):**
```sql
SELECT
    task_code,
    task_name,
    total_float_hr_cnt,
    status_code,
    act_start_date,
    act_end_date,
    target_start_date,
    target_end_date
FROM TASK
WHERE proj_id = ?
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## 4. Settings Page

**Page:** `settings.html`

### 4.1 Gantt Projects (Settings)
**Endpoint:** `GET /api/gantt/projects`
**Query (SQLite):**
```sql
SELECT 
    proj_id,
    proj_short_name,
    proj_short_name as proj_name,
    plan_start_date,
    plan_end_date,
    last_recalc_date as data_date
FROM PROJECT 
ORDER BY proj_short_name
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 4.2 Project Table Data
**Endpoint:** `GET /api/database/table/PROJECT`
**Query (SQLite):**
```sql
SELECT * FROM "PROJECT" WHERE proj_id = ?
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 4.3 Gantt Activities
**Endpoint:** `GET /api/gantt/activities`
**Query (SQLite):**
```sql
SELECT
    task_id,
    task_code,
    task_name,
    target_start_date AS startDate,
    target_end_date AS endDate,
    remain_drtn_hr_cnt AS duration,
    status_code AS status,
    driving_path_flag AS critical,
    wbs_id
FROM TASK
WHERE proj_id = ?
-- Optional filters for status and lookAhead
ORDER BY target_start_date ASC/DESC
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 4.4 Task Table Data
**Endpoint:** `GET /api/database/table/TASK`
**Query (SQLite):**
```sql
-- For TASK table with AWP information:
WITH RECURSIVE ActivityHierarchy AS (
    SELECT
        a.actv_code_id,
        a.actv_code_type_id,
        a.actv_code_name,
        a.short_name,
        a.parent_actv_code_id,
        0 as level,
        CAST(a.short_name AS VARCHAR(1000)) as hierarchy_path
    FROM ACTVCODE a
    WHERE nullif(a.parent_actv_code_id,'') IS NULL

    UNION ALL

    SELECT
        c.actv_code_id,
        c.actv_code_type_id,
        c.actv_code_name,
        c.short_name,
        c.parent_actv_code_id,
        p.level + 1,
        CAST(p.hierarchy_path || ' > ' || c.short_name AS VARCHAR(1000))
    FROM ACTVCODE c
    INNER JOIN ActivityHierarchy p ON c.parent_actv_code_id = p.actv_code_id
)
select at.actv_code_type, ta.*, t.task_code, t.task_name, h.* 
from TASKACTV ta
left join ActivityHierarchy h on ta.actv_code_id = h.actv_code_id
Left join TASK t on t.task_id = ta.task_id and t.proj_id = ta.proj_id
left join ACTVTYPE at on at.actv_code_type_id = h.actv_code_type_id
where 
at.actv_code_type like '%AWP %' 
and ta.proj_id = ?
order by ta.task_id
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 4.5 WBS Table Data
**Endpoint:** `GET /api/database/table/PROJWBS`
**Query (SQLite):**
```sql
SELECT * FROM "PROJWBS" WHERE proj_id = ?
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## 5. -THIS PAGE IS NO MORE ACTIVE BUT CHECK Dashboard Page ---THIS PAGE IS NO MORE ACTIVE BUT CHECK

**Page:** `dashboard.html`

### 5.1 Database Projects
**Endpoint:** `GET /api/database/projects`
**Query (SQLite):**
```sql
SELECT proj_id, proj_short_name AS proj_name FROM PROJECT ORDER BY proj_short_name
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 5.2 Hierarchical Tasks
**Endpoint:** `GET /api/tasks/hierarchical`
**Query (SQLite):**
```sql
WITH RECURSIVE wbs_hierarchy (
     proj_id,
    wbs_id,
    wbs_name,
    parent_wbs_id,
    path,
    seq_num,
    wbs_short_name
) AS (
    -- Base case: root WBS items
    SELECT 
        proj_id,
        wbs_id,
        wbs_name,
        parent_wbs_id,
        CAST(wbs_id AS TEXT) AS path,
        '1' AS seq_num,
        1 AS wbs_short_name
    FROM projwbs p
    WHERE proj_id = ?

    UNION ALL

    -- Recursive case: children of WBS
    SELECT
        w.proj_id,
        w.wbs_id,
        w.wbs_name,
        w.parent_wbs_id,
        h.path || ' > ' || w.wbs_id AS path,
        h.seq_num || '.' || printf('%02d', (
            SELECT COUNT(*) + 1
            FROM projwbs w2
            WHERE w2.parent_wbs_id = w.parent_wbs_id
              AND w2.wbs_short_name < w.wbs_short_name
        )) AS seq_num,
        h.wbs_short_name + 1
    FROM projwbs w
    JOIN wbs_hierarchy h ON w.parent_wbs_id = h.wbs_id
    WHERE w.proj_id = ?
)
SELECT 
    w.seq_num,
    w.wbs_name,
    w.wbs_short_name,
    w.parent_wbs_id,
    t.task_id,
    t.proj_id,
    t.task_code,
    t.task_name,
    t.wbs_id,
    t.act_start_date,
    t.act_end_date,
    t.target_start_date,
    t.target_end_date,
    t.status_code,
    t.driving_path_flag,
    t.target_drtn_hr_cnt,
    t.total_float_hr_cnt,
    CASE
        WHEN t.status_code IN ('TK_Complete','TK_Active') THEN t.act_start_date
        ELSE t.target_start_date
    END AS start_date,
    CASE
        WHEN t.status_code IN ('TK_NotStart','TK_Active') THEN t.target_end_date
        ELSE t.act_end_date
    END AS end_date
FROM wbs_hierarchy w
LEFT JOIN TASK t 
    ON t.wbs_id = w.wbs_id AND t.proj_id = w.proj_id 
WHERE w.proj_id = ?
ORDER BY w.seq_num, t.task_code
LIMIT ? OFFSET ?
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## 6. Compliance Page

**Page:** `compliance.html`

### 6.1 Database Projects (Compliance)
**Endpoint:** `GET /api/database/projects`
**Query (SQLite):**
```sql
SELECT proj_id, proj_short_name AS proj_name FROM PROJECT ORDER BY proj_short_name
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 6.2 Task Data for Compliance
**Endpoint:** `GET /api/database/table/TASK`
**Query (SQLite):**
```sql
SELECT * FROM "TASK" WHERE proj_id = ?
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## 7. Analysis Pages

**Page:** `analysis.html` / `analysis_vanilla.js`

### 7.1 Progress Data
**Endpoint:** `GET /api/progress-data`
**Query (SQLite):**
```sql
-- Sample implementation (exact query may vary)
SELECT 
    strftime('%Y-%m', act_start_date) as period,
    AVG(phys_complete_pct) as actual,
    AVG(remain_drtn_hr_cnt / target_drtn_hr_cnt * 100) as planned,
    COUNT(*) as task_count
FROM TASK 
WHERE proj_id = ?
GROUP BY strftime('%Y-%m', act_start_date)
ORDER BY period
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 7.2 Projects List
**Endpoint:** `GET /api/projects`
**Query (SQLite):**
```sql
SELECT 
    proj_id,
    proj_short_name as proj_name,
    plan_start_date,
    plan_end_date
FROM PROJECT 
ORDER BY proj_short_name
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## 8. Global/Shared Endpoints

### 8.1 Database Tables List
**Endpoint:** `GET /api/database/tables`
**Query (SQLite):**
```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 8.2 Gantt Statuses
**Endpoint:** `GET /api/gantt/statuses`
**Query (SQLite):**
```sql
SELECT DISTINCT status_code FROM TASK WHERE proj_id = ? ORDER BY status_code
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 8.3 WBS Structure
**Endpoint:** `GET /api/wbs-structure`
**Query (SQLite):**
```sql
-- Same as hierarchical-gantt but without pagination
WITH RECURSIVE WBStructure (wbs_id, parent_wbs_id, wbs_name, level, path) AS (
    SELECT
        p.wbs_id,
        p.parent_wbs_id,
        p.wbs_name,
        0 AS level,
        CAST(p.wbs_name AS TEXT) AS path
    FROM PROJWBS p
    WHERE p.proj_id = ? AND (
        p.parent_wbs_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM PROJWBS parent WHERE parent.wbs_id = p.parent_wbs_id)
    )

    UNION ALL

    SELECT
        p_child.wbs_id,
        p_child.parent_wbs_id,
        p_child.wbs_name,
        cte.level + 1,
        cte.path || ' > ' || p_child.wbs_name
    FROM PROJWBS p_child
    INNER JOIN WBStructure cte ON p_child.parent_wbs_id = cte.wbs_id
    WHERE p_child.proj_id = ?
)
SELECT
    t.task_id,
    t.task_name,
    CASE
        WHEN t.status_code IN ('TK_Complete','TK_Active') THEN t.act_start_date
        ELSE t.target_start_date
    END AS start_date,
    CASE
        WHEN t.status_code IN ('TK_NotStart','TK_Active') THEN t.target_end_date
        ELSE t.act_end_date
    END AS end_date,
    t.status_code,
    t.driving_path_flag,
    t.target_drtn_hr_cnt,
    t.task_code,
    wbs.wbs_id AS task_wbs_id,
    wbs.level AS wbs_level,
    wbs.path AS wbs_path,
    substr('', 1, wbs.level * 2) || wbs.wbs_name AS indented_wbs_name
FROM TASK t
INNER JOIN WBStructure wbs ON t.wbs_id = wbs.wbs_id
WHERE t.proj_id = ?
ORDER BY wbs.path, start_date
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 8.4 AWP Tasks
**Endpoint:** `GET /api/awp_tasks`
**Query (SQLite):**
```sql
WITH RECURSIVE H_Activity AS (
    -- Base level (root nodes)
    SELECT 
        actv_code_id,
        at.proj_id,
        ac.short_name AS Activity_code,
        ac.actv_code_name AS Activity_name,
        parent_actv_code_id,
        at.actv_code_type,
        ac.seq_num,
        ac.color,
        '1' AS sequence,
        1 AS level
    FROM ACTVCODE ac
    LEFT JOIN ACTVTYPE at ON ac.actv_code_type_id = at.actv_code_type_id
    WHERE ac.parent_actv_code_id IS '' OR ac.parent_actv_code_id IS NULL

    UNION ALL

    -- Recursive: get children of each node
    SELECT 
        ac.actv_code_id,
        h.proj_id,
        ac.short_name AS Activity_code,
        ac.actv_code_name AS Activity_name,
        ac.parent_actv_code_id,
        at.actv_code_type,
        ac.seq_num,
        ac.color,
        h.sequence || '.' || (
            SELECT 
                printf('%02d', COUNT(*))
            FROM ACTVCODE siblings
            WHERE siblings.parent_actv_code_id = ac.parent_actv_code_id
              AND siblings.seq_num <= ac.seq_num
        ) AS sequence,
        h.level + 1
    FROM ACTVCODE ac
    INNER JOIN H_Activity h ON h.actv_code_id = ac.parent_actv_code_id
    LEFT JOIN ACTVTYPE at ON ac.actv_code_type_id = at.actv_code_type_id
)

SELECT *
FROM H_Activity
where proj_id = ?
ORDER BY sequence
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 8.5 Health Check
**Endpoint:** `GET /api/health`
**Query (SQLite):**
```sql
SELECT 1 as status
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

### 8.6 Database Diagnostics
**Endpoint:** `GET /api/database/diagnostics`
**Query (SQLite):**
```sql
-- Check primavera_p6.db
SELECT name FROM sqlite_master WHERE type='table';

-- Check bim_xer_masher.db  
SELECT name FROM sqlite_master WHERE type='table'
```
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## 9. Upload & File Processing

### 9.1 XER File Upload
**Endpoint:** `POST /api/xer/upload`
**Page:** `upload.html`
**Note:** File processing endpoint - no SQL query, but creates/updates database tables

### 9.2 Custom Database Query
**Endpoint:** `POST /api/database/query`
**Page:** `portfolio-management.html`
**Query (SQLite):** User-provided SQL query in request body
**Query (PostgreSQL):** `<!-- TODO: Convert to PostgreSQL -->`

---

## Migration Notes

### Key SQLite to PostgreSQL Conversion Areas:

1. **Date Functions:**
   - `strftime()` → `to_char()` or `date_trunc()`
   - `datetime()` → `to_timestamp()`

2. **String Functions:**
   - `printf('%02d', ...)` → `LPAD(CAST(... AS VARCHAR), 2, '0')`
   - `substr()` → `substring()`

3. **System Tables:**
   - `sqlite_master` → `information_schema.tables`
   - `type='table'` → `table_type='BASE TABLE'`

4. **Data Types:**
   - `TEXT` → `VARCHAR` or `TEXT`
   - Parameter placeholders: `?` → `$1, $2, $3...`

5. **Recursive CTEs:**
   - Syntax is mostly compatible, minor adjustments needed

### Summary Statistics:
- **Total Unique Endpoints:** ~35 endpoints
- **Pages Using APIs:** 8 main pages
- **Main Tables:** PROJECT, TASK, PROJWBS, TASKPRED, ACTVCODE, ACTVTYPE, TASKACTV
- **Complex Queries:** 15+ with recursive CTEs
- **Simple Queries:** 20+ basic SELECT statements

### Recommended Migration Order:
1. Simple SELECT queries (projects, tables list)
2. Basic filtered queries (tasks by project)
3. Recursive CTE queries (WBS hierarchy, AWP hierarchy)
4. Complex analytical queries (schedule metrics)
5. Custom query endpoints 