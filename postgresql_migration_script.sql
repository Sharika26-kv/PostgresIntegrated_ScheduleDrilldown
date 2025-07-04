-- PostgreSQL Migration Script
-- Generated from SQLite_to_PostgreSQL_Migration_Queries.md
-- Date: 2025-01-26

-- =============================================================================
-- 1. Schedule Projects Query
-- Endpoint: GET /api/schedule/projects
-- Purpose: Get distinct project IDs for dropdown/selection
-- =============================================================================

-- Query to get distinct project IDs and names
SELECT DISTINCT 
    project_id as id, 
    project_id as name
FROM activity_relationship_view 
ORDER BY project_id;

-- Alternative with explicit casting for PostgreSQL compatibility
SELECT DISTINCT 
    project_id::TEXT as id, 
    project_id::TEXT as name
FROM activity_relationship_view 
ORDER BY project_id;

-- =============================================================================
-- 2. ActivityRelationshipView Creation
-- Purpose: Create the main view for activity relationships with calculated columns
-- =============================================================================

CREATE VIEW activity_relationship_view AS
 WITH activity_relationship_view_cte AS (
SELECT 
    tk.proj_id AS project_id,
    tk.task_code AS activity_id,
    tk.task_name AS activity_name,
    tk.target_drtn_hr_cnt AS original_duration,
    tk.status_code AS activity_status,
    tk1.task_code AS activity_id2,
    tk1.task_name AS activity_name2,
    tk1.status_code AS activity_status2,
    tp.lag_hr_cnt AS lag,
    tk.driving_path_flag AS driving,
    tk.free_float_hr_cnt AS free_float,
    tp.pred_type AS relationship_type,
    -- Calculated Column: Predecessor_Activity_Duration
    CAST(tp.lag_hr_cnt AS REAL) / NULLIF(CAST(tk.target_drtn_hr_cnt AS REAL), 0) AS predecessor_activity_duration,
    -- Calculated Column: Relationship_Status
    CASE
        WHEN tk.status_code = 'TK_Complete' AND tk1.status_code = 'TK_Complete' THEN 'Complete'
        ELSE 'Incomplete'
    END AS relationship_status
FROM taskpred tp
INNER JOIN task tk 
    ON tk.task_id = tp.task_id
    AND tk.task_id IS NOT NULL
INNER JOIN task tk1 
    ON tk1.task_id = tp.pred_task_id
    AND tk1.task_id IS NOT NULL
)
SELECT
    activity_id,
    project_id,
    activity_name,
    original_duration,
    activity_status,
    activity_id2,
    activity_name2,
    activity_status2,
    lag,
    driving,
    free_float,
    relationship_type,
    predecessor_activity_duration,
    relationship_status,
    -- Calculated Column: ExcessiveLag
    CASE
        WHEN predecessor_activity_duration >= 0.75 THEN 'Excessive Lag'
        ELSE NULL
    END AS excessive_lag,
    -- Calculated Column: Lags
    CASE WHEN lag > 0 THEN 'Lag' ELSE NULL END AS lags,
    -- Calculated Column: Lead
    CASE WHEN lag < 0 THEN 'Lead' ELSE NULL END AS lead,
    -- Calculated Column: LeadORLag
    CASE WHEN lag <> 0 THEN 'Lead or Lag' ELSE 'None' END AS lead_or_lag
FROM activity_relationship_view_cte
GROUP BY 
    activity_id,
    project_id,
    activity_name,
    original_duration,
    activity_status,
    activity_id2,
    activity_name2,
    activity_status2,
    lag,
    driving,
    free_float,
    relationship_type,
    predecessor_activity_duration,
    relationship_status,
    excessive_lag,
    lags,
    lead,
    lead_or_lag;

-- =============================================================================
-- 3. Leads KPI Queries
-- Endpoint: GET /api/schedule/leads-kpi
-- Purpose: Get leads count, remaining relationships, and total relationships
-- =============================================================================

-- Leads count
SELECT COUNT(*) as leads_count 
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) < 0 
-- Optional project filter: [AND project_id = $1]
;

-- Remaining relationships count
SELECT COUNT(*) as remaining_count 
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' 
-- Optional project filter: [AND project_id = $1]
;

-- Total relationships count
SELECT COUNT(*) as total_count 
FROM activity_relationship_view 
-- Optional project filter: [WHERE project_id = $1]
;

-- =============================================================================
-- 4. Leads Chart Data
-- Endpoint: GET /api/schedule/leads-chart-data
-- Purpose: Get chart data for leads analysis
-- =============================================================================

SELECT 
    lag,
    relationship_type,
    COUNT(*) as count
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) < 0 
-- Optional project filter: [AND project_id = $1]
GROUP BY lag, relationship_type
ORDER BY lag, relationship_type;

-- =============================================================================
-- 5. Leads Percentage History
-- Endpoint: GET /api/schedule/leads-percentage-history
-- =============================================================================

SELECT
    TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
    AVG(f.relationship_percentage) as percentage
FROM final_activity_kpi_view f
INNER JOIN project p ON f.project_id = p.proj_id
INNER JOIN activity_relationship_view a ON f.project_id = a.project_id
WHERE f.relationship_percentage IS NOT NULL AND CAST(a.lag AS REAL) < 0 
-- Optional project filter: [AND f.project_id = $1]
GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM')
ORDER BY date;

-- =============================================================================
-- 6. Leads Detail
-- Endpoint: GET /api/schedule/leads
-- =============================================================================

SELECT *
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) < 0 
-- Optional project filter: [AND project_id = $1]
ORDER BY lag, relationship_type;

-- =============================================================================
-- 7. Lags KPI
-- Endpoint: GET /api/schedule/lags-kpi
-- =============================================================================

SELECT COUNT(*) as lags_count 
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) > 0 
-- Optional project filter: [AND project_id = $1]
;

-- =============================================================================
-- 8. Lags Chart Data
-- Endpoint: GET /api/schedule/lags-chart-data
-- =============================================================================

SELECT 
    lag,
    relationship_type,
    COUNT(*) as count
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) > 0 
-- Optional project filter: [AND project_id = $1]
GROUP BY lag, relationship_type
ORDER BY lag, relationship_type;

-- =============================================================================
-- 9. Excessive Lags KPI
-- Endpoint: GET /api/schedule/excessive-lags-kpi
-- =============================================================================

SELECT COUNT(*) as excessive_lags_count 
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) > 40 
-- Optional project filter: [AND project_id = $1]
;

-- =============================================================================
-- 10. FS (Finish-to-Start) KPI
-- Endpoint: GET /api/schedule/fs-kpi
-- =============================================================================

SELECT COUNT(*) as fs_count 
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' AND relationship_type = 'FS' 
-- Optional project filter: [AND project_id = $1]
;

-- =============================================================================
-- 11. Non-FS KPI
-- Endpoint: GET /api/schedule/non-fs-kpi
-- =============================================================================

SELECT COUNT(*) as non_fs_count 
FROM activity_relationship_view 
WHERE relationship_status = 'Incomplete' AND relationship_type != 'FS' 
-- Optional project filter: [AND project_id = $1]
;

-- =============================================================================
-- 12. Gantt Projects
-- Endpoint: GET /api/gantt/projects
-- =============================================================================

SELECT 
    proj_id,
    proj_short_name,
    proj_short_name as proj_name,
    plan_start_date,
    plan_end_date,
    last_recalc_date as data_date
FROM project 
ORDER BY proj_short_name;

-- =============================================================================
-- 13. AWP Hierarchy (Recursive View)
-- Endpoint: GET /api/awp/projects/:projectId/hierarchy
-- =============================================================================

WITH RECURSIVE activity_hierarchy AS (
    SELECT
        actv_code_id,         -- Primary key
        actv_code_type_id,    -- Type ID
        actv_code_name,       -- Code name
        short_name,           -- Short name
        parent_actv_code_id,  -- Parent reference
        0 as level,           -- Hierarchy level
        short_name as hierarchy_path  -- Path string
    FROM actvcode
    WHERE parent_actv_code_id IS NULL OR parent_actv_code_id = ''  -- Root nodes

    UNION ALL

    SELECT
        c.actv_code_id,       -- Child primary key
        c.actv_code_type_id,  -- Child type ID
        c.actv_code_name,     -- Child code name
        c.short_name,         -- Child short name
        c.parent_actv_code_id, -- Child parent reference
        p.level + 1,          -- Increment level
        CONCAT(p.hierarchy_path, ' > ', c.short_name) -- Build path
    FROM actvcode c
    INNER JOIN activity_hierarchy p ON c.parent_actv_code_id = p.actv_code_id  -- Recursive join
)
SELECT *
FROM activity_hierarchy h
LEFT JOIN actvtype at ON h.actv_code_type_id = at.actv_code_type_id  -- Join type table
WHERE at.actv_code_type LIKE '%AWP%'  -- Filter for AWP types
ORDER BY hierarchy_path;              -- Sort by path

-- =============================================================================
-- 14. AWP Tasks View Creation
-- Purpose: Create view for AWP tasks with activity code information
-- =============================================================================

CREATE VIEW awp_tasks AS
SELECT 
    t.*,                     -- All task columns
    ta.actv_code_id,         -- Activity code ID
    ac.short_name as awp_code,     -- AWP code
    ac.actv_code_name as awp_name, -- AWP name
    at.actv_code_type        -- Activity code type
FROM task t
LEFT JOIN taskactv ta ON t.task_id = ta.task_id AND t.proj_id = ta.proj_id  -- Task activity join
LEFT JOIN actvcode ac ON ta.actv_code_id = ac.actv_code_id                  -- Activity code join
LEFT JOIN actvtype at ON ac.actv_code_type_id = at.actv_code_type_id        -- Activity type join
WHERE at.actv_code_type LIKE '%AWP%'    -- Filter for AWP types only
ORDER BY t.task_code;                   -- Sort by task code

-- =============================================================================
-- 15. Task Predecessors
-- Endpoint: GET /api/awp/projects/:projectId/predecessors
-- =============================================================================

SELECT 
    tp.task_pred_id,                    -- Task predecessor ID
    tp.task_id AS successor_id,         -- Successor task ID
    tp.pred_task_id AS predecessor_id,  -- Predecessor task ID
    tp.pred_type,                       -- Predecessor type
    tp.lag_hr_cnt,                      -- Lag hours count
    t1.task_code AS successor_code,     -- Successor task code
    t1.task_name AS successor_name,     -- Successor task name
    t2.task_code AS predecessor_code,   -- Predecessor task code
    t2.task_name AS predecessor_name    -- Predecessor task name
FROM taskpred tp
LEFT JOIN task t1 ON tp.task_id = t1.task_id AND tp.proj_id = t1.proj_id      -- Join successor task
LEFT JOIN task t2 ON tp.pred_task_id = t2.task_id AND tp.proj_id = t2.proj_id -- Join predecessor task
ORDER BY tp.task_id, tp.pred_task_id;  -- Sort by task IDs

-- =============================================================================
-- 16. Task Data (General)
-- Purpose: Basic task information query
-- =============================================================================

SELECT
    task_code,          -- Task code
    task_name,          -- Task name
    total_float_hr_cnt, -- Total float hours
    status_code,        -- Status code
    act_start_date,     -- Actual start date
    act_end_date,       -- Actual end date
    target_start_date,  -- Target start date
    target_end_date     -- Target end date
FROM task;              -- Task table

-- =============================================================================
-- 17. Project Data (General)
-- Purpose: Basic project information query
-- =============================================================================

SELECT 
    proj_id,                        -- Project ID
    proj_short_name,                -- Project short name
    proj_short_name as proj_name,   -- Project name alias
    plan_start_date,                -- Planned start date
    plan_end_date,                  -- Planned end date
    last_recalc_date as data_date   -- Last recalculation date
FROM project                        -- Project table
ORDER BY proj_short_name;           -- Sort by project name

-- =============================================================================
-- 18. Gantt Tasks
-- Endpoint: GET /api/gantt/tasks
-- =============================================================================

SELECT
    task_id,                            -- Task ID
    task_code,                          -- Task code
    task_name,                          -- Task name
    target_start_date AS start_date,    -- Start date alias
    target_end_date AS end_date,        -- End date alias
    remain_drtn_hr_cnt AS duration,     -- Duration alias
    status_code AS status,              -- Status alias
    driving_path_flag AS critical,      -- Critical path flag
    wbs_id                              -- WBS ID
FROM task
                     -- Project filter parameter
-- Optional filters for status and lookAhead can be added
ORDER BY target_start_date;            -- Sort by start date (ASC/DESC as needed)

-- =============================================================================
-- 19. Project WBS Data
-- Endpoint: GET /api/database/table/PROJWBS
-- =============================================================================

SELECT * FROM projwbs;  -- Get all WBS data for project

-- =============================================================================
-- 20. Project Names
-- Purpose: Get project ID and name pairs
-- =============================================================================

SELECT 
    proj_id, 
    proj_short_name AS proj_name    -- Project name alias
FROM project 
ORDER BY proj_short_name;           -- Sort by project name

-- =============================================================================
-- 21. Task Table Data (Compliance)
-- Endpoint: GET /api/database/table/TASK
-- =============================================================================

SELECT * FROM task;  -- Get all task data for project

-- =============================================================================
-- 22. Progress Data
-- Endpoint: GET /api/progress-data
-- =============================================================================
SELECT 
    TO_CHAR(act_start_date::DATE, 'YYYY-MM') as period,              -- Period conversion
    AVG(CAST(phys_complete_pct AS REAL)) as actual,                  -- Cast to numeric for AVG
    AVG(CAST(remain_drtn_hr_cnt AS REAL) / NULLIF(CAST(target_drtn_hr_cnt AS REAL), 0) * 100) as planned, -- Cast all to numeric
    COUNT(*) as task_count                                           -- Task count
FROM task                                                 -- Project filter parameter
GROUP BY TO_CHAR(act_start_date::DATE, 'YYYY-MM')                   -- Group by period
ORDER BY period;                                                    -- Sort by period                                               -- Sort by period

-- =============================================================================
-- 23. Projects List
-- Endpoint: GET /api/projects
-- =============================================================================

SELECT 
    proj_id,                    -- Project ID
    proj_short_name as proj_name, -- Project name alias
    plan_start_date,            -- Planned start date
    plan_end_date               -- Planned end date
FROM project                    -- Project table
ORDER BY proj_short_name;       -- Sort by project name

-- =============================================================================
-- 24. Database Tables List
-- Endpoint: GET /api/database/tables
-- =============================================================================

SELECT table_name as name       -- Table name
FROM information_schema.tables 
WHERE table_schema = 'public'   -- Filter for public schema
ORDER BY table_name;            -- Sort by table name

-- =============================================================================
-- 25. Gantt Statuses
-- Endpoint: GET /api/gantt/statuses
-- =============================================================================

SELECT DISTINCT status_code     -- Unique status codes
FROM task 
ORDER BY status_code;          -- Sort by status code

-- =============================================================================
-- 27. Health Check
-- Endpoint: GET /api/health
-- =============================================================================

SELECT 1 as status;              -- Simple health status check

-- =============================================================================
-- 28. Database Diagnostics
-- Endpoint: GET /api/database/diagnostics  
-- =============================================================================

-- Check database tables (PostgreSQL equivalent)
SELECT table_name as name        -- Table name
FROM information_schema.tables 
WHERE table_schema = 'public'    -- Filter for public schema
ORDER BY table_name;             -- Sort by table name

-- Alternative: Check all schemas
SELECT 
    table_schema,                -- Schema name
    table_name as name           -- Table name
FROM information_schema.tables 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')  -- Exclude system schemas
ORDER BY table_schema, table_name;  -- Sort by schema then table name

-- =============================================================================
-- 29. WBS Structure View Creation
-- Purpose: Create view for WBS structure with tasks (Project 389)
-- =============================================================================

CREATE VIEW wbs_structure AS
WITH RECURSIVE wbs_hierarchy (wbs_id, parent_wbs_id, wbs_name, level, path) AS (
    SELECT
        p.wbs_id,                      -- WBS ID
        p.parent_wbs_id,               -- Parent WBS ID
        p.wbs_name,                    -- WBS name
        0 AS level,                    -- Initial level
        p.wbs_name::TEXT AS path       -- Initial path
    FROM projwbs p
    WHERE p.proj_id = '389' AND (      -- Hardcoded project ID 389
        p.parent_wbs_id IS NULL        -- Root nodes
        OR NOT EXISTS (SELECT 1 FROM projwbs parent WHERE parent.wbs_id = p.parent_wbs_id) -- Orphaned nodes
    )
    UNION ALL
    SELECT
        p_child.wbs_id,                           -- Child WBS ID
        p_child.parent_wbs_id,                   -- Child parent WBS ID
        p_child.wbs_name,                        -- Child WBS name
        cte.level + 1,                           -- Increment level
        cte.path || ' > ' || p_child.wbs_name    -- Build hierarchical path
    FROM projwbs p_child
    INNER JOIN wbs_hierarchy cte ON p_child.parent_wbs_id = cte.wbs_id  -- Recursive join
    WHERE p_child.proj_id = '389'              -- Hardcoded project ID 389
)
SELECT
    t.task_id,                       -- Task ID
    t.task_name,                     -- Task name
    CASE
        WHEN t.status_code IN ('TK_Complete','TK_Active') THEN t.act_start_date    -- Use actual if complete/active
        ELSE t.target_start_date     -- Use target for others
    END AS start_date,               -- Calculated start date
    CASE
        WHEN t.status_code IN ('TK_NotStart','TK_Active') THEN t.target_end_date   -- Use target if not started/active
        ELSE t.act_end_date          -- Use actual for others
    END AS end_date,                 -- Calculated end date
    t.status_code,                   -- Task status
    t.driving_path_flag,             -- Critical path flag
    t.target_drtn_hr_cnt,            -- Target duration hours
    t.task_code,                     -- Task code
    wbs.wbs_id AS task_wbs_id,       -- WBS ID for task
    wbs.level AS wbs_level,          -- WBS hierarchy level
    wbs.path AS wbs_path,            -- Full WBS path
    REPEAT(' ', wbs.level * 2) || wbs.wbs_name AS indented_wbs_name  -- Indented WBS name
FROM task t
INNER JOIN wbs_hierarchy wbs ON t.wbs_id = wbs.wbs_id  -- Join with WBS hierarchy
ORDER BY wbs.path, start_date;       -- Sort by WBS path then start date

-- =============================================================================
-- Notes:
-- 1. Changed table name from ActivityRelationshipView to activity_relationship_view 
--    (PostgreSQL convention uses lowercase with underscores)
-- 2. Changed column name from Project_ID to project_id (following PostgreSQL naming conventions)
-- 3. Added explicit casting option for string conversion if needed
-- 4. PostgreSQL is case-sensitive, so ensure table and column names match your schema
-- 5. All table names converted: TASKPRED -> taskpred, TASK -> task
-- 6. All column names converted to lowercase_with_underscores format
-- 7. CTE syntax is compatible with PostgreSQL
-- 8. All CASE statements and functions work in PostgreSQL
-- 9. Added CAST(lag AS REAL) for numeric comparisons to avoid type errors
-- 10. Parameter placeholders changed from ? to $1 (PostgreSQL style)
-- 11. Added date casting for TO_CHAR function: p.last_recalc_date::DATE
-- 12. PROJECT table converted to lowercase 'project'
-- 13. Added AWP hierarchy recursive CTE query
-- 14. Added AWP tasks view creation
-- 15. Added task predecessors query
-- 16. Added general task data query
-- 17. Added general project data query
-- 18. Added gantt tasks query
-- 19. Added project WBS data query
-- 20. Added project names query
-- 21. Added task table data (compliance) query
-- 22. Added progress data query with proper numeric casting
-- 23. Added projects list query
-- 24. Added database tables list query (PostgreSQL system tables)
-- 25. Added gantt statuses query
-- 26. Added WBS structure with tasks (recursive)
-- 27. Added health check query
-- 28. Added database diagnostics query
-- =============================================================================
 