-- Test query to understand Resource Load Count
SELECT 
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE activitystatus IN ('Active', 'NotStart')) as active_notstart_rows,
    COUNT(*) FILTER (WHERE activitystatus IN ('Active', 'NotStart') AND resource IS NOT NULL) as with_resource_rows,
    COUNT(*) FILTER (WHERE activitystatus IN ('Active', 'NotStart') AND resource IS NOT NULL AND resource != '') as final_count,
    COUNT(*) FILTER (WHERE activitystatus IN ('Active', 'NotStart') AND resource IS NOT NULL AND resource != '' AND resource != ' ') as final_count_no_space
FROM activityanalysisview; 