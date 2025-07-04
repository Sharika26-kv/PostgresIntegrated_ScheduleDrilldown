-- Drop views if they exist to avoid conflicts
DROP VIEW IF EXISTS activity_relationship_view CASCADE;
DROP VIEW IF EXISTS awp_tasks CASCADE;
DROP VIEW IF EXISTS wbs_structure CASCADE;

-- Create the activity_relationship_view
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
    CAST(tp.lag_hr_cnt AS INTEGER) AS lag,
    tk.driving_path_flag AS driving,
    tk.free_float_hr_cnt AS free_float,
    tp.pred_type AS relationship_type,
    CAST(tp.lag_hr_cnt AS REAL) / NULLIF(CAST(tk.target_drtn_hr_cnt AS REAL), 0) AS predecessor_activity_duration,
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
    CASE
        WHEN predecessor_activity_duration >= 0.75 THEN 'Excessive Lag'
        ELSE NULL
    END AS excessive_lag,
    CASE WHEN CAST(lag AS INTEGER) > 0 THEN 'Lag' ELSE NULL END AS lags,
    CASE WHEN CAST(lag AS INTEGER) < 0 THEN 'Lead' ELSE NULL END AS lead,
    CASE WHEN CAST(lag AS INTEGER) <> 0 THEN 'Lead or Lag' ELSE 'None' END AS lead_or_lag
FROM activity_relationship_view_cte;

-- Create the awp_tasks view
CREATE VIEW awp_tasks AS
SELECT 
    task_id,
    proj_id,
    task_code,
    task_name,
    target_drtn_hr_cnt,
    status_code,
    driving_path_flag,
    free_float_hr_cnt,
    total_float_hr_cnt,
    target_start_date,
    target_end_date,
    act_start_date,
    act_end_date,
    phys_complete_pct,
    remain_drtn_hr_cnt,
    early_start_date,
    early_end_date,
    late_start_date,
    late_end_date,
    suspend_date,
    resume_date,
    cstr_date,
    cstr_type,
    priority_type,
    guid,
    tmpl_guid,
    clndr_id,
    rsrc_id
FROM task;

-- Create the wbs_structure view
CREATE VIEW wbs_structure AS
WITH RECURSIVE wbs_tree AS (
    SELECT 
        wbs_id,
        parent_wbs_id,
        proj_id,
        obs_id,
        seq_num,
        status_code,
        wbs_short_name,
        wbs_name,
        proj_node_flag,
        sum_data_flag,
        status_date,
        start_date,
        end_date,
        expect_end_date,
        guid,
        tmpl_guid,
        orig_cost,
        indep_remain_total_cost,
        ann_dscnt_rate_pct,
        dscnt_period_type,
        indep_remain_work_qty,
        anticip_start_date,
        anticip_end_date,
        ev_user_pct,
        ev_etc_user_value,
        orig_start_date,
        orig_end_date,
        target_start_date,
        target_end_date,
        schedule_pct,
        ev_compute_type,
        ev_etc_compute_type,
        1 as level
    FROM projwbs
    WHERE parent_wbs_id IS NULL

    UNION ALL

    SELECT 
        w.wbs_id,
        w.parent_wbs_id,
        w.proj_id,
        w.obs_id,
        w.seq_num,
        w.status_code,
        w.wbs_short_name,
        w.wbs_name,
        w.proj_node_flag,
        w.sum_data_flag,
        w.status_date,
        w.start_date,
        w.end_date,
        w.expect_end_date,
        w.guid,
        w.tmpl_guid,
        w.orig_cost,
        w.indep_remain_total_cost,
        w.ann_dscnt_rate_pct,
        w.dscnt_period_type,
        w.indep_remain_work_qty,
        w.anticip_start_date,
        w.anticip_end_date,
        w.ev_user_pct,
        w.ev_etc_user_value,
        w.orig_start_date,
        w.orig_end_date,
        w.target_start_date,
        w.target_end_date,
        w.schedule_pct,
        w.ev_compute_type,
        w.ev_etc_compute_type,
        wt.level + 1
    FROM projwbs w
    INNER JOIN wbs_tree wt ON w.parent_wbs_id = wt.wbs_id
)
SELECT * FROM wbs_tree; 