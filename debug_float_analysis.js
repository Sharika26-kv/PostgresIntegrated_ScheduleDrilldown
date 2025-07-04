// Debug script for Float Analysis - Run this in browser console
console.log('=== FLOAT ANALYSIS DEBUG SCRIPT ===');

// Check if the tab is active
const floatTab = document.getElementById('floatAnalysisTabPanel');
console.log('Float Analysis tab panel found:', !!floatTab);
console.log('Float Analysis tab is active:', floatTab?.classList.contains('active'));

// Check chart container
const chartContainer = document.getElementById('floatAnalysisVisual');
console.log('Chart container found:', !!chartContainer);
console.log('Chart container dimensions:', {
    width: chartContainer?.offsetWidth,
    height: chartContainer?.offsetHeight,
    visibility: chartContainer?.style.visibility,
    display: chartContainer?.style.display
});

// Check chart instance
console.log('Chart instance exists:', !!window.floatAnalysisChartInstance);
if (window.floatAnalysisChartInstance) {
    console.log('Chart data:', window.floatAnalysisChartInstance.data);
}

// Check table
const table = document.getElementById('floatAnalysisTable');
const tableBody = table?.querySelector('tbody');
console.log('Table found:', !!table);
console.log('Table body found:', !!tableBody);
console.log('Table rows count:', tableBody?.children.length);

// Check current project state
console.log('Current project ID:', window.state?.currentProject);

// Test API endpoint directly
const currentProjectId = window.state?.currentProject;
if (currentProjectId) {
    console.log('Testing API endpoint directly...');
    fetch(`/api/gantt/projects/${currentProjectId}/tasks`)
        .then(response => response.json())
        .then(data => {
            console.log('API Response received:', data.length, 'tasks');
            if (data.length > 0) {
                console.log('Sample task from API:', data[0]);
                console.log('Available properties:', Object.keys(data[0]));
                
                // Check for different possible property names
                const sampleTask = data[0];
                console.log('Property analysis:');
                console.log('  task_name:', sampleTask.task_name);
                console.log('  name:', sampleTask.name);
                console.log('  activity_name:', sampleTask.activity_name);
                console.log('  task_code:', sampleTask.task_code);
                console.log('  act_start_date:', sampleTask.act_start_date);
                console.log('  actual_start:', sampleTask.actual_start);
                console.log('  act_end_date:', sampleTask.act_end_date);
                console.log('  actual_end:', sampleTask.actual_end);
            }
        })
        .catch(error => console.error('API Error:', error));
} else {
    console.log('No current project ID found - select a project first');
} 