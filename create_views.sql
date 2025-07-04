-- Create the activity_relationship_view
CREATE OR REPLACE VIEW activity_relationship_view AS
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

-- Create the awp_tasks view
CREATE OR REPLACE VIEW awp_tasks AS
SELECT 
    t.task_id,
    t.proj_id,
    t.task_code,
    t.task_name,
    t.target_drtn_hr_cnt,
    t.status_code,
    t.driving_path_flag,
    t.free_float_hr_cnt,
    t.total_float_hr_cnt,
    t.target_start_date,
    t.target_end_date,
    t.act_start_date,
    t.act_end_date,
    t.phys_complete_pct,
    t.remain_drtn_hr_cnt,
    t.early_start_date,
    t.early_end_date,
    t.late_start_date,
    t.late_end_date,
    t.suspend_date,
    t.resume_date,
    t.cstr_date,
    t.cstr_type,
    t.priority_type,
    t.guid,
    t.tmpl_guid,
    t.clndr_id,
    t.rsrc_id,
    t.total_qty,
    t.target_qty,
    t.remain_qty,
    t.target_cost,
    t.act_cost,
    t.remain_cost,
    t.target_equip_qty,
    t.act_equip_qty,
    t.remain_equip_qty
FROM task t;

-- Create the wbs_structure view
CREATE OR REPLACE VIEW wbs_structure AS
WITH RECURSIVE wbs_tree AS (
    -- Base case: get root WBS elements
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

    -- Recursive case: get child WBS elements
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