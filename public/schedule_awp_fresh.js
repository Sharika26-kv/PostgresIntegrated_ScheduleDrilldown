// Fresh AWP Schedule implementation with critical improvements and timeline slicer
// Global variables
let awpData = [];
let selectedAwpId = null; // Track selected AWP activity
let filteredTasks = []; // Tasks for the selected AWP
let hierarchicalData = []; // Combined hierarchy for display
let currentProjectId = null;
let timelineRange = { start: null, end: null };
let expandedNodes = new Set();
let currentTimelineScale = 'weekly'; // 'weekly', 'monthly' - daily removed

// Enhanced configuration with timeline scale support
const CONFIG = {
    ROW_HEIGHT: 22, // Reduced from 30 to 22 for more compact rows
    MIN_DAY_WIDTH: 20, // Reduced from 30 to 20 for more compact timeline
    MAX_TIMELINE_DAYS: 365, // Maximum days to display
    SHOW_DEPENDENCIES: false,
    BAR_HEIGHT: 18, // Reduced from 24 to 18 for more compact bars
    BAR_MARGIN: 2, // Reduced from 3 to 2 for tighter spacing
    COLORS: {
        ACTIVITY: '#9CA3AF', // Gray for activities - no red even for critical
        ACTIVITY_HIGH_PROGRESS: '#6B7280', // Darker gray for high completion
        ACTIVITY_MEDIUM_PROGRESS: '#9CA3AF', // Medium gray for medium completion  
        ACTIVITY_LOW_PROGRESS: '#D1D5DB', // Light gray for low completion
        TASK: '#3B82F6', // Blue for non-critical tasks (changed from green)
        CRITICAL: '#EF4444', // Red for critical tasks only
        COMPLETE: '#059669', // Green for completed
        TODAY_LINE: '#DC2626', // Red for today line
        PROGRESS: 'rgba(255, 255, 255, 0.3)', // Semi-transparent progress overlay
        MILESTONE: '#FF9800', // Orange for TT_Mile
        FINISH_MILESTONE: '#E91E63' // Pink for TT_FinMile
    },
    INDENT: {
        ACTIVITY: 6, // Reduced from 8 to 6
        TASK: 18 // Reduced from 24 to 18
    },
    TIMELINE_SCALES: {
        weekly: {
            name: 'Weekly', 
            minWidth: 80,
            maxWidth: 200,
            defaultWidth: 120,
            units: 'weeks',
            headerLevels: 2 // Month/Year and Week
        },
        monthly: {
            name: 'Monthly',
            minWidth: 80,
            maxWidth: 180,
            defaultWidth: 120,
            units: 'months',
            headerLevels: 2 // Year and Month
        }
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Fresh AWP Schedule implementation with timeline slicer starting...');
    
    setupEventListeners();
    setupResizeHandle();
    setupTimelineSlicerControls();
    loadProjects();
    
    console.log('✅ Initialization complete');
});

// Setup event listeners
function setupEventListeners() {
    // Project selection
    const projectSelect = document.getElementById('projectSelect');
    if (projectSelect) {
        projectSelect.addEventListener('change', function() {
            const projectId = this.value;
            if (projectId) {
                currentProjectId = projectId;
                loadProjectData(projectId);
            } else {
                clearData();
            }
        });
    }
    
    // Dependencies toggle
    const toggleDependencies = document.getElementById('toggleDependencies');
    if (toggleDependencies) {
        toggleDependencies.addEventListener('click', function() {
            CONFIG.SHOW_DEPENDENCIES = !CONFIG.SHOW_DEPENDENCIES;
            this.textContent = CONFIG.SHOW_DEPENDENCIES ? 'Hide Dependencies' : 'Show Dependencies';
            this.className = CONFIG.SHOW_DEPENDENCIES ? 
                'px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600' : 
                'px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600';
            renderGantt(); // Re-render with/without dependencies
        });
    }
    

    
    // Setup scroll synchronization
    setupScrollSync();
    
    // Add window resize listener for responsive Gantt chart
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (hierarchicalData.length > 0) {
                renderGantt();
                renderGanttHeader();
            }
        }, 250);
    });
}

// Setup resize handle for split panels
function setupResizeHandle() {
    const resizeHandle = document.getElementById('resizeHandle');
    const tablePanel = document.querySelector('.table-panel');
    const ganttPanel = document.querySelector('.gantt-panel');
    
    if (!resizeHandle || !tablePanel || !ganttPanel) return;
    
    let isResizing = false;
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
    });
    
    function handleMouseMove(e) {
        if (!isResizing) return;
        
        const container = document.querySelector('.split-container');
        const rect = container.getBoundingClientRect();
        const percentage = ((e.clientX - rect.left) / rect.width) * 100;
        
        // Limit resize between 20% and 70% (allowing more table flexibility)
        const clampedPercentage = Math.max(20, Math.min(70, percentage));
        
        tablePanel.style.width = `${clampedPercentage}%`;
        
        // Trigger immediate re-render for responsive feedback (throttled)
        if (!tablePanel.resizeTimeout) {
            tablePanel.resizeTimeout = setTimeout(() => {
                if (hierarchicalData.length > 0) {
                    renderGantt();
                    renderGanttHeader();
                }
                tablePanel.resizeTimeout = null;
            }, 50); // Faster response during drag
        }
    }
    
    function handleMouseUp() {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Trigger re-render of Gantt chart when resize completes
        setTimeout(() => {
            renderGantt();
            renderGanttHeader();
        }, 100);
    }
}

// Setup scroll synchronization between table and gantt
function setupScrollSync() {
    const tableContent = document.querySelector('.table-content');
    const ganttContent = document.querySelector('.gantt-content');
    const ganttHeader = document.querySelector('.gantt-header');
    
    if (!tableContent || !ganttContent || !ganttHeader) return;
    
    let syncingScroll = false;
    
    tableContent.addEventListener('scroll', function() {
        if (!syncingScroll) {
            syncingScroll = true;
            ganttContent.scrollTop = this.scrollTop;
            setTimeout(() => syncingScroll = false, 10);
        }
    });
    
    ganttContent.addEventListener('scroll', function() {
        if (!syncingScroll) {
            syncingScroll = true;
            // Sync vertical scroll with table
            tableContent.scrollTop = this.scrollTop;
            
            // Sync horizontal scroll with header (but don't show header scrollbar)
            ganttHeader.scrollLeft = this.scrollLeft;
            
            setTimeout(() => syncingScroll = false, 10);
        }
    });
}

// Load available projects
async function loadProjects() {
    try {
        console.log('📡 Loading projects...');
        
        const response = await fetch('/api/gantt/projects');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const projects = await response.json();
        console.log(`✅ Loaded ${projects.length} projects`);
        
        const projectSelect = document.getElementById('projectSelect');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Select a project...</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.proj_id;
                option.textContent = `${project.proj_id} - ${project.proj_name || project.proj_short_name}`;
                projectSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Error loading projects:', error);
        showError('Could not load projects from server');
    }
}

// Load project data using the correct API endpoints
async function loadProjectData(projectId) {
    try {
        showLoading();
        console.log(`📡 Loading AWP data for project ${projectId}...`);
        
        // Use the specified API endpoints
        const [hierarchyResponse, tasksResponse, dependenciesResponse] = await Promise.all([
            fetch(`/api/awp/projects/${projectId}/hierarchy`),
            fetch(`/api/awp/projects/${projectId}/tasks`),
            fetch(`/api/awp/projects/${projectId}/dependencies`)
        ]);
        
        if (!hierarchyResponse.ok) {
            throw new Error(`Hierarchy API failed: HTTP ${hierarchyResponse.status}: ${hierarchyResponse.statusText}`);
        }
        if (!tasksResponse.ok) {
            throw new Error(`Tasks API failed: HTTP ${tasksResponse.status}: ${tasksResponse.statusText}`);
        }
        if (!dependenciesResponse.ok) {
            throw new Error(`Dependencies API failed: HTTP ${dependenciesResponse.status}: ${dependenciesResponse.statusText}`);
        }
        
        const [hierarchyData, tasksData, dependenciesData] = await Promise.all([
            hierarchyResponse.json(),
            tasksResponse.json(),
            dependenciesResponse.json()
        ]);
        
        console.log(`✅ Loaded ${hierarchyData.length} AWP hierarchy records`);
        console.log(`✅ Loaded ${tasksData.length} task records`);
        console.log(`✅ Loaded ${dependenciesData.length} dependency records`);
        
        // Store the data
        awpData = hierarchyData;
        window.tasksData = tasksData; // Store tasks data globally
        window.dependenciesData = dependenciesData; // Store dependencies data globally
        
        processData();
        renderAll();
        
    } catch (error) {
        console.error('❌ Error loading project data:', error);
        showError(`Failed to load project data: ${error.message}`);
    }
}

// Process raw data with enhanced timeline calculation and hierarchy building
function processData() {
    console.log('🔍 Processing data with enhanced logic...', { 
        totalHierarchyRecords: awpData.length,
        totalTaskRecords: window.tasksData ? window.tasksData.length : 0,
        totalDependencies: window.dependenciesData ? window.dependenciesData.length : 0
    });
    
    // FIXED: Build enhanced hierarchy FIRST so activities have calculated dates
    buildEnhancedHierarchy();
    
    // THEN calculate optimal timeline range from actual task dates AND hierarchical activities
    calculateOptimalTimelineRange();
}

// Calculate optimal timeline range from actual task data with scale-aware padding
function calculateOptimalTimelineRange() {
    console.log('🔍 Calculating optimal timeline range from task data...');
    const allValidDates = [];
    
    // Collect all valid dates from tasks data with detailed logging
    if (window.tasksData && window.tasksData.length > 0) {
        console.log('📊 Analyzing tasks for date range:', window.tasksData.length, 'total tasks');
        
        window.tasksData.forEach((task, index) => {
            // Check all possible date fields and use the best available
            const startDate = task.target_start_date || task.act_start_date || task.early_start_date;
            const endDate = task.target_end_date || task.act_end_date || task.early_end_date;
            
            if (startDate) {
                const date = new Date(startDate);
                if (!isNaN(date) && date.getFullYear() > 1900 && date.getFullYear() < 3000) {
                    allValidDates.push(date);
                    if (index < 5) { // Log first 5 for debugging
                        console.log(`📅 Task ${index + 1} start:`, startDate, '→', date.toISOString().split('T')[0]);
                    }
                }
            }
            if (endDate) {
                const date = new Date(endDate);
                if (!isNaN(date) && date.getFullYear() > 1900 && date.getFullYear() < 3000) {
                    allValidDates.push(date);
                    if (index < 5) { // Log first 5 for debugging
                        console.log(`📅 Task ${index + 1} end:`, endDate, '→', date.toISOString().split('T')[0]);
                    }
                }
            }
        });
    }
    
    // ENHANCED: Also collect dates from hierarchical activities if they exist
    if (hierarchicalData && hierarchicalData.length > 0) {
        console.log('📊 Also analyzing hierarchical activities for date range:', hierarchicalData.length, 'activities');
        
        hierarchicalData.forEach((activity, index) => {
            if (activity.calculated_start_date) {
                const date = new Date(activity.calculated_start_date);
                if (!isNaN(date) && date.getFullYear() > 1900 && date.getFullYear() < 3000) {
                    allValidDates.push(date);
                    if (index < 3) { // Log first 3 for debugging
                        console.log(`📅 Activity ${activity.Activity_code} start:`, activity.calculated_start_date, '→', date.toISOString().split('T')[0]);
                    }
                }
            }
            if (activity.calculated_end_date) {
                const date = new Date(activity.calculated_end_date);
                if (!isNaN(date) && date.getFullYear() > 1900 && date.getFullYear() < 3000) {
                    allValidDates.push(date);
                    if (index < 3) { // Log first 3 for debugging
                        console.log(`📅 Activity ${activity.Activity_code} end:`, activity.calculated_end_date, '→', date.toISOString().split('T')[0]);
                    }
                }
            }
        });
    }
    
    console.log('📊 Found valid dates:', allValidDates.length, 'from', window.tasksData?.length || 0, 'tasks and', hierarchicalData?.length || 0, 'activities');
    
    if (allValidDates.length > 0) {
        // Calculate actual project boundaries
        const originalStart = new Date(Math.min(...allValidDates));
        const originalEnd = new Date(Math.max(...allValidDates));
        
        // Log the extreme dates for debugging
        const sortedDates = allValidDates.sort((a, b) => a - b);
        const latestDates = sortedDates.slice(-5).map(d => d.toISOString().split('T')[0]);
        const earliestDates = sortedDates.slice(0, 5).map(d => d.toISOString().split('T')[0]);
        
        console.log('🎯 Raw date range before padding:', {
            earliest: originalStart.toISOString().split('T')[0],
            latest: originalEnd.toISOString().split('T')[0],
            earliestDates: earliestDates,
            latestDates: latestDates,
            spanYears: originalEnd.getFullYear() - originalStart.getFullYear(),
            totalValidDates: allValidDates.length
        });
        
        timelineRange.start = new Date(originalStart);
        timelineRange.end = new Date(originalEnd);
        
        // Add scale-aware padding with better month boundary handling
        let paddingAmount;
        switch (currentTimelineScale) {
            case 'daily':
                paddingAmount = 7; // 7 days padding
                timelineRange.start.setDate(timelineRange.start.getDate() - paddingAmount);
                timelineRange.end.setDate(timelineRange.end.getDate() + paddingAmount);
                break;
            case 'weekly':
                paddingAmount = 2; // 2 weeks padding
                timelineRange.start.setDate(timelineRange.start.getDate() - (paddingAmount * 7));
                timelineRange.end.setDate(timelineRange.end.getDate() + (paddingAmount * 7));
                // Align to week boundaries (Monday start)
                const startDayOfWeek = timelineRange.start.getDay();
                const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
                timelineRange.start.setDate(timelineRange.start.getDate() - daysToMonday);
                
                const endDayOfWeek = timelineRange.end.getDay();
                const daysToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
                timelineRange.end.setDate(timelineRange.end.getDate() + daysToSunday);
                break;
            case 'monthly':
                paddingAmount = 1; // 1 month padding  
                
                // Extend to month boundaries first, then add padding
                timelineRange.start.setDate(1); // Start of month
                
                // For end date: go to end of the month containing the latest activity date
                // Then add padding month
                timelineRange.end.setMonth(timelineRange.end.getMonth() + 1 + paddingAmount);
                timelineRange.end.setDate(0); // Last day of previous month (end of target month)
                
                // Also add padding to start
                timelineRange.start.setMonth(timelineRange.start.getMonth() - paddingAmount);
                break;
        }
        
        console.log('✅ Dynamic timeline range calculated:', {
            scale: currentTimelineScale,
            originalStart: originalStart.toISOString().split('T')[0],
            originalEnd: originalEnd.toISOString().split('T')[0],
            finalStart: timelineRange.start.toISOString().split('T')[0],
            finalEnd: timelineRange.end.toISOString().split('T')[0],
            finalStartMonth: timelineRange.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            finalEndMonth: timelineRange.end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            totalDays: Math.ceil((timelineRange.end - timelineRange.start) / (1000 * 60 * 60 * 24)),
            startYear: timelineRange.start.getFullYear(),
            endYear: timelineRange.end.getFullYear(),
            yearSpan: timelineRange.end.getFullYear() - timelineRange.start.getFullYear(),
            paddingAmount: paddingAmount
        });
    } else {
        // Fallback to current date if no valid dates found
        console.warn('⚠️ No valid task dates found, using fallback range');
        timelineRange.start = new Date();
        timelineRange.end = new Date();
        
        switch (currentTimelineScale) {
            case 'daily':
                timelineRange.end.setMonth(timelineRange.end.getMonth() + 3);
                break;
            case 'weekly':
                timelineRange.end.setMonth(timelineRange.end.getMonth() + 6);
                break;
            case 'monthly':
                timelineRange.end.setFullYear(timelineRange.end.getFullYear() + 1);
                break;
        }
        
        console.log('📅 Using fallback timeline range:', {
            start: timelineRange.start.toISOString().split('T')[0],
            end: timelineRange.end.toISOString().split('T')[0]
        });
    }
}

// Build enhanced hierarchy with ALL activities (including parents without direct tasks)
function buildEnhancedHierarchy() {
    console.log('🏗️ Building enhanced hierarchy...');
    hierarchicalData = [];
    
    if (!awpData.length) {
        console.warn('⚠️ No AWP data to process');
        updateCountDisplay();
        return;
    }
    
    // Group tasks by AWP activity
    const tasksByActivity = new Map();
    if (window.tasksData) {
        window.tasksData.forEach(task => {
            const activityId = task.actv_code_id;
            if (!tasksByActivity.has(activityId)) {
                tasksByActivity.set(activityId, []);
            }
            tasksByActivity.get(activityId).push(task);
        });
    }
    
    // Helper function to get all descendant tasks for an activity (recursive)
    function getAllDescendantTasks(activityId) {
        const allTasks = [];
        
        // Get direct tasks
        const directTasks = tasksByActivity.get(activityId) || [];
        allTasks.push(...directTasks);
        
        // Get tasks from child activities
        const childActivities = awpData.filter(child => child.parent_actv_code_id === activityId);
        childActivities.forEach(child => {
            const childTasks = getAllDescendantTasks(child.actv_code_id);
            allTasks.push(...childTasks);
        });
        
        return allTasks;
    }
    
    // FIXED: Build hierarchy recursively to maintain parent-child order
    function buildHierarchyRecursively(parentId = null, currentLevel = 1) {
        // Find activities at this level
        const activitiesAtLevel = awpData.filter(activity => {
            if (parentId === null) {
                return !activity.parent_actv_code_id || activity.parent_actv_code_id === '';
            } else {
                return activity.parent_actv_code_id === parentId;
            }
        });
        
        // Sort activities at this level by sequence
        activitiesAtLevel.sort((a, b) => {
            const seqA = parseFloat(a.sequence || a.seq_num || 0);
            const seqB = parseFloat(b.sequence || b.seq_num || 0);
            return seqA - seqB;
        });
        
        activitiesAtLevel.forEach(activity => {
            const directTasks = tasksByActivity.get(activity.actv_code_id) || [];
            const allDescendantTasks = getAllDescendantTasks(activity.actv_code_id);
            
            // Calculate activity dates from ALL descendant tasks
            const startDates = [];
            const endDates = [];
            
            allDescendantTasks.forEach(task => {
                // Get best available start date
                const startDate = task.target_start_date || task.act_start_date || task.early_start_date;
                if (startDate) {
                    const date = new Date(startDate);
                    if (!isNaN(date)) startDates.push(date);
                }
                
                // Get best available end date  
                const endDate = task.target_end_date || task.act_end_date || task.early_end_date;
                if (endDate) {
                    const date = new Date(endDate);
                    if (!isNaN(date)) endDates.push(date);
                }
            });
            
            console.log(`📅 Activity ${activity.Activity_code || activity.actv_code_id} (Level ${currentLevel}):`, {
                directTaskCount: directTasks.length,
                totalDescendantTasks: allDescendantTasks.length,
                isExpanded: expandedNodes.has(activity.actv_code_id),
                startDatesFound: startDates.length,
                endDatesFound: endDates.length
            });
            
            // Enhanced activity object - always include all activities
            const enhancedActivity = {
                ...activity,
                type: 'activity',
                isExpanded: expandedNodes.has(activity.actv_code_id),
                Activity_code: activity.activity_code || activity.Activity_code || activity.actv_code_id || activity.short_name,
                Activity_name: activity.activity_name || activity.Activity_name || activity.actv_code_name || 'Unnamed Activity',
                level: currentLevel,
                taskCount: allDescendantTasks.length, // Total descendant tasks
                directTaskCount: directTasks.length, // Direct tasks only
                calculated_start_date: startDates.length > 0 ? new Date(Math.min(...startDates)) : null,
                calculated_end_date: endDates.length > 0 ? new Date(Math.max(...endDates)) : null,
                progress: allDescendantTasks.length > 0 ? calculateActivityProgress(allDescendantTasks) : 0,
                hasCriticalPath: allDescendantTasks.some(task => task.driving_path_flag === 'Y'),
                hasDirectTasks: directTasks.length > 0,
                hasDescendantTasks: allDescendantTasks.length > 0
            };
            
            // Add the activity to hierarchy
            hierarchicalData.push(enhancedActivity);
            
            // FIXED: Add direct tasks immediately after the activity if expanded
            if (enhancedActivity.isExpanded && directTasks.length > 0) {
                // Sort tasks by start date (earliest first)
                const sortedTasks = directTasks.sort((a, b) => {
                    const startA = new Date(a.target_start_date || a.act_start_date || a.early_start_date || '2099-01-01');
                    const startB = new Date(b.target_start_date || b.act_start_date || b.early_start_date || '2099-01-01');
                    return startA - startB;
                });
                
                sortedTasks.forEach(task => {
                    const enhancedTask = {
                        ...task,
                        type: 'task',
                        Activity_code: task.task_code,
                        Activity_name: task.task_name,
                        level: currentLevel + 1,
                        parent_actv_code_id: activity.actv_code_id,
                        // Store raw date fields for bar rendering
                        target_start_date: task.target_start_date,
                        target_end_date: task.target_end_date,
                        act_start_date: task.act_start_date,
                        act_end_date: task.act_end_date,
                        early_start_date: task.early_start_date,
                        early_end_date: task.early_end_date,
                        duration_days: calculateTaskDuration(task),
                        progress: task.phys_complete_pct || 0,
                        isCritical: task.driving_path_flag === 'Y'
                    };
                    hierarchicalData.push(enhancedTask);
                });
            }
            
            // Recursively build child activities (but only if activity is expanded)
            if (enhancedActivity.isExpanded) {
                buildHierarchyRecursively(activity.actv_code_id, currentLevel + 1);
            }
        });
    }
    
    // Start building from root level
    buildHierarchyRecursively();
    
    console.log('✅ Enhanced hierarchy built with proper parent-child order:', {
        totalItems: hierarchicalData.length,
        activities: hierarchicalData.filter(item => item.type === 'activity').length,
        activitiesWithDirectTasks: hierarchicalData.filter(item => item.type === 'activity' && item.hasDirectTasks).length,
        activitiesWithDescendantTasks: hierarchicalData.filter(item => item.type === 'activity' && item.hasDescendantTasks).length,
        activitiesWithoutTasks: hierarchicalData.filter(item => item.type === 'activity' && !item.hasDescendantTasks).length,
        tasks: hierarchicalData.filter(item => item.type === 'task').length,
        expandedActivities: Array.from(expandedNodes)
    });
    
    updateCountDisplay();
}

// Calculate activity progress from child tasks
function calculateActivityProgress(tasks) {
    if (!tasks || tasks.length === 0) return 0;
    
    const totalProgress = tasks.reduce((sum, task) => {
        return sum + (parseFloat(task.phys_complete_pct) || 0);
    }, 0);
    
    return Math.round(totalProgress / tasks.length);
}

// Calculate task duration in days
function calculateTaskDuration(task) {
    // First try using target_drtn_hr_cnt (convert hours to days)
    if (task.target_drtn_hr_cnt) {
        return Math.ceil(parseFloat(task.target_drtn_hr_cnt) / 8); // 8 hours per day
    }
    
    // Fallback to date difference
    const startDate = new Date(task.act_start_date || task.target_start_date || task.early_start_date);
    const endDate = new Date(task.act_end_date || task.target_end_date || task.early_end_date);
    
    if (!isNaN(startDate) && !isNaN(endDate)) {
        return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
    }
    
    return 1; // Default to 1 day
}

// Render all components
function renderAll() {
    renderTable();
    renderGanttHeader();
    renderGantt();
}

// Enhanced table rendering with hierarchy support
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    console.log('🔄 Rendering enhanced table with', hierarchicalData.length, 'items');
    
    tableBody.innerHTML = '';
    
    if (hierarchicalData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="padding: 20px; text-align: center; color: #6b7280;">No activities with tasks found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    hierarchicalData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = `${item.type === 'activity' ? 'awp-row' : 'task-row'} clickable-row`;
        row.style.height = `${CONFIG.ROW_HEIGHT}px`;
        row.dataset.itemIndex = index; // Store index for focusing
        
        // Styling based on item type
        if (item.type === 'activity') {
            row.style.backgroundColor = '#f8f9fa';
            row.style.fontWeight = '600';
            row.style.cursor = 'pointer';
            
            // Click to expand/collapse AND auto-focus
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleExpand(item.actv_code_id);
                focusOnActivity(item, index);
            });
        } else {
            row.style.backgroundColor = item.isCritical ? '#fef2f2' : '#ffffff';
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('📝 Task selected:', item.Activity_name);
                focusOnActivity(item, index);
            });
        }
        
        // Activity/Task Code
        const codeCell = document.createElement('td');
        codeCell.style.width = '120px';
        codeCell.style.fontSize = item.type === 'activity' ? '13px' : '12px';
        codeCell.textContent = item.Activity_code || '-';
        row.appendChild(codeCell);
        
        // Name with proper indentation and icons
        const nameCell = document.createElement('td');
        nameCell.style.width = '300px';
        nameCell.style.fontSize = item.type === 'activity' ? '13px' : '12px';
        
        const baseIndent = item.type === 'activity' ? CONFIG.INDENT.ACTIVITY : CONFIG.INDENT.TASK;
        const levelIndent = ((item.level || 1) - 1) * 16;
        nameCell.style.paddingLeft = `${baseIndent + levelIndent}px`;
        
        // Add expand/collapse triangle for activities
        if (item.type === 'activity') {
            const triangle = document.createElement('span');
            triangle.className = 'expand-triangle';
            triangle.style.cssText = `
                display: inline-block;
                width: 0;
                height: 0;
                margin-right: 8px;
                cursor: pointer;
                border-style: solid;
            `;
            
            if (item.isExpanded) {
                triangle.style.borderLeft = '6px solid transparent';
                triangle.style.borderRight = '6px solid transparent';
                triangle.style.borderTop = '8px solid #6b7280';
                triangle.style.borderBottom = 'none';
            } else {
                triangle.style.borderTop = '6px solid transparent';
                triangle.style.borderBottom = '6px solid transparent';
                triangle.style.borderLeft = '8px solid #6b7280';
                triangle.style.borderRight = 'none';
            }
            
            nameCell.appendChild(triangle);
            
            // Add task count for activities
            const taskCount = document.createElement('span');
            taskCount.style.cssText = `
                color: #6b7280;
                font-size: 11px;
                margin-left: 8px;
            `;
            taskCount.textContent = `(${item.taskCount} tasks)`;
        }
        
        nameCell.appendChild(document.createTextNode(item.Activity_name || '-'));
        
        // Add task count for activities
        if (item.type === 'activity') {
            const taskCount = document.createElement('span');
            taskCount.style.cssText = `
                color: #6b7280;
                font-size: 11px;
                margin-left: 8px;
            `;
            const directTasksText = item.directTaskCount > 0 ? `${item.directTaskCount} direct` : '';
            const descendantTasksText = item.taskCount > item.directTaskCount ? `${item.taskCount - item.directTaskCount} descendant` : '';
            
            let taskCountText = '';
            if (directTasksText && descendantTasksText) {
                taskCountText = `(${directTasksText}, ${descendantTasksText})`;
            } else if (directTasksText) {
                taskCountText = `(${directTasksText} tasks)`;
            } else if (descendantTasksText) {
                taskCountText = `(${descendantTasksText} tasks)`;
            } else {
                taskCountText = '(0 tasks)';
            }
            
            taskCount.textContent = taskCountText;
            nameCell.appendChild(taskCount);
        }
        
        row.appendChild(nameCell);
        
        // Level
        const levelCell = document.createElement('td');
        levelCell.style.width = '60px';
        levelCell.textContent = item.level || '-';
        row.appendChild(levelCell);
        
        // Progress with actual data
        const progressCell = document.createElement('td');
        progressCell.style.width = '80px';
        const progress = item.progress || 0;
        progressCell.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="width: 40px; height: 8px; background: #e5e7eb; border-radius: 4px; margin-right: 8px;">
                    <div style="width: ${progress}%; height: 100%; background: ${progress > 0 ? CONFIG.COLORS.COMPLETE : '#e5e7eb'}; border-radius: 4px;"></div>
                </div>
                <span style="font-size: 11px;">${progress}%</span>
            </div>
        `;
        row.appendChild(progressCell);
        
        // Duration
        const durationCell = document.createElement('td');
        durationCell.style.width = '80px';
        if (item.type === 'task' && item.duration_days) {
            durationCell.textContent = `${item.duration_days}d`;
        } else {
            durationCell.textContent = '-';
        }
        row.appendChild(durationCell);
        
        // Type with critical path indicator and milestone icons
        const typeCell = document.createElement('td');
        typeCell.style.width = '100px';
        typeCell.style.fontSize = '11px';
        
        let typeText = '';
        if (item.task_type === 'TT_Mile') {
            typeText = '◆ Start Milestone';
            typeCell.style.color = CONFIG.COLORS.MILESTONE;
            typeCell.style.fontWeight = '600';
        } else if (item.task_type === 'TT_FinMile') {
            typeText = '◆ Finish Milestone';
            typeCell.style.color = CONFIG.COLORS.FINISH_MILESTONE;
            typeCell.style.fontWeight = '600';
        } else {
            typeText = item.type === 'activity' ? 'Activity' : 'Task';
        }
        
        if (item.isCritical) {
            typeText += ' 🔴';
        }
        if (item.type === 'activity' && item.hasCriticalPath) {
            typeText += ' ⚡';
        }
        
        typeCell.textContent = typeText;
        row.appendChild(typeCell);
        
        tableBody.appendChild(row);
    });
    
    console.log('✅ Enhanced table rendered with', hierarchicalData.length, 'rows');
    updateCountDisplay();
}

// Auto-focus on selected activity/task with dynamic timeline optimization
function focusOnActivity(item, rowIndex) {
    const ganttContent = document.getElementById('ganttContent');
    const ganttHeader = document.getElementById('ganttHeader');
    
    if (!ganttContent || !ganttHeader) return;
    
    console.log('🎯 Focusing on:', item.Activity_name, 'at row', rowIndex);
    
    // Calculate optimal timeline for this activity
    calculateOptimalTimelineForActivity(item);
    
    // Calculate vertical scroll position
    const rowHeight = CONFIG.ROW_HEIGHT;
    const verticalScrollTop = rowIndex * rowHeight;
    
    // Re-render timeline with new optimal settings
    renderGanttHeader();
    renderGantt();
    
    // Smooth scroll to position (no horizontal scroll needed since timeline is optimized)
    ganttContent.scrollTo({
        left: 0, // Start from beginning since timeline is now optimized
        top: verticalScrollTop,
        behavior: 'smooth'
    });
    
    // Highlight the selected row and bar
    highlightSelectedRow(rowIndex);
}

// Calculate optimal timeline settings for a specific activity
function calculateOptimalTimelineForActivity(item) {
    console.log('📊 Calculating optimal timeline for activity:', item.Activity_name);
    
    let activityTaskDates = [];
    
    if (item.type === 'activity') {
        // Get all tasks for this activity
        const activityTasks = window.tasksData ? window.tasksData.filter(task => 
            task.actv_code_id === item.actv_code_id
        ) : [];
        
        // Also get all descendant tasks if activity has children
        const getAllDescendantTasksForActivity = (activityId) => {
            const allTasks = [];
            const directTasks = window.tasksData ? window.tasksData.filter(task => 
                task.actv_code_id === activityId
            ) : [];
            allTasks.push(...directTasks);
            
            // Get tasks from child activities
            const childActivities = awpData.filter(child => child.parent_actv_code_id === activityId);
            childActivities.forEach(child => {
                const childTasks = getAllDescendantTasksForActivity(child.actv_code_id);
                allTasks.push(...childTasks);
            });
            
            return allTasks;
        };
        
        const allActivityTasks = getAllDescendantTasksForActivity(item.actv_code_id);
        
        // Collect all dates from these tasks
        allActivityTasks.forEach(task => {
            const startDate = task.target_start_date || task.act_start_date || task.early_start_date;
            const endDate = task.target_end_date || task.act_end_date || task.early_end_date;
            
            if (startDate) {
                const date = new Date(startDate);
                if (!isNaN(date)) activityTaskDates.push(date);
            }
            if (endDate) {
                const date = new Date(endDate);
                if (!isNaN(date)) activityTaskDates.push(date);
            }
        });
    } else {
        // For individual tasks, just use the task's dates
        const startDate = item.target_start_date || item.act_start_date || item.early_start_date;
        const endDate = item.target_end_date || item.act_end_date || item.early_end_date;
        
        if (startDate) {
            const date = new Date(startDate);
            if (!isNaN(date)) activityTaskDates.push(date);
        }
        if (endDate) {
            const date = new Date(endDate);
            if (!isNaN(date)) activityTaskDates.push(date);
        }
    }
    
    if (activityTaskDates.length === 0) {
        console.warn('⚠️ No valid dates found for activity, using current timeline');
        return;
    }
    
    // Calculate the date range for this activity
    const minDate = new Date(Math.min(...activityTaskDates));
    const maxDate = new Date(Math.max(...activityTaskDates));
    const daySpan = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log('📅 Activity date analysis:', {
        activityName: item.Activity_name,
        taskCount: activityTaskDates.length / 2, // Start + end dates
        minDate: minDate.toISOString().split('T')[0],
        maxDate: maxDate.toISOString().split('T')[0],
        daySpan: daySpan
    });
    
    // Determine optimal scale based on day span
    let optimalScale;
    if (daySpan <= 30) {
        optimalScale = 'daily';   // 1 month or less: daily view
    } else if (daySpan <= 180) {
        optimalScale = 'weekly';  // 6 months or less: weekly view
    } else {
        optimalScale = 'monthly'; // More than 6 months: monthly view
    }
    
    // Update timeline scale if different
    if (optimalScale !== currentTimelineScale) {
        console.log(`🔄 Auto-switching timeline scale from ${currentTimelineScale} to ${optimalScale}`);
        currentTimelineScale = optimalScale;
        updateTimelineScaleButtons();
    }
    
    // Set optimized timeline range with appropriate padding
    const paddingDays = optimalScale === 'daily' ? 3 : optimalScale === 'weekly' ? 7 : 15;
    
    timelineRange.start = new Date(minDate);
    timelineRange.start.setDate(timelineRange.start.getDate() - paddingDays);
    
    timelineRange.end = new Date(maxDate);
    timelineRange.end.setDate(timelineRange.end.getDate() + paddingDays);
    
    // Align to appropriate boundaries
    if (optimalScale === 'weekly') {
        // Align to week boundaries (Monday start)
        const startDayOfWeek = timelineRange.start.getDay();
        const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        timelineRange.start.setDate(timelineRange.start.getDate() - daysToMonday);
        
        const endDayOfWeek = timelineRange.end.getDay();
        const daysToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
        timelineRange.end.setDate(timelineRange.end.getDate() + daysToSunday);
    } else if (optimalScale === 'monthly') {
        // Align to month boundaries
        timelineRange.start.setDate(1);
        timelineRange.end.setMonth(timelineRange.end.getMonth() + 1);
        timelineRange.end.setDate(0); // Last day of previous month
    }
    
    console.log('✅ Optimized timeline range:', {
        scale: optimalScale,
        start: timelineRange.start.toISOString().split('T')[0],
        end: timelineRange.end.toISOString().split('T')[0],
        totalDays: Math.ceil((timelineRange.end - timelineRange.start) / (1000 * 60 * 60 * 24))
    });
}

// Update timeline scale button states without triggering scale change
function updateTimelineScaleButtons() {
    const dailyBtn = document.getElementById('dailyBtn');
    const weeklyBtn = document.getElementById('weeklyBtn');
    const monthlyBtn = document.getElementById('monthlyBtn');
    
    // Reset all buttons
    [dailyBtn, weeklyBtn, monthlyBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
            btn.style.background = 'white';
            btn.style.color = '#374151';
        }
    });
    
    // Set active button
    let activeBtn;
    switch (currentTimelineScale) {
        case 'daily':
            activeBtn = dailyBtn;
            break;
        case 'weekly':
            activeBtn = weeklyBtn;
            break;
        case 'monthly':
            activeBtn = monthlyBtn;
            break;
    }
    
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = '#3b82f6';
        activeBtn.style.color = 'white';
    }
}

// Add visual feedback for selected activity/task
function highlightSelectedRow(rowIndex) {
    // Remove existing highlights
    document.querySelectorAll('.selected-row').forEach(row => {
        row.classList.remove('selected-row');
    });
    document.querySelectorAll('.selected-bar').forEach(bar => {
        bar.classList.remove('selected-bar');
    });
    
    // Highlight selected table row
    const tableRows = document.querySelectorAll('#tableBody tr');
    if (tableRows[rowIndex]) {
        tableRows[rowIndex].classList.add('selected-row');
        console.log('✨ Highlighted table row', rowIndex);
    }
    
    // Highlight corresponding Gantt bar
    const ganttBars = document.querySelectorAll('.gantt-bar');
    if (ganttBars[rowIndex]) {
        ganttBars[rowIndex].classList.add('selected-bar');
        console.log('✨ Highlighted Gantt bar', rowIndex);
    }
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
        if (tableRows[rowIndex]) {
            tableRows[rowIndex].classList.remove('selected-row');
        }
        if (ganttBars[rowIndex]) {
            ganttBars[rowIndex].classList.remove('selected-bar');
        }
        console.log('🔄 Removed highlights for row', rowIndex);
    }, 3000);
}

// Scale-aware Gantt header rendering
function renderGanttHeader() {
    const ganttHeader = document.getElementById('ganttHeader');
    const ganttContent = document.getElementById('ganttContent');
    
    console.log('🔍 renderGanttHeader called - checking prerequisites:', {
        ganttHeader: !!ganttHeader,
        ganttContent: !!ganttContent,
        timelineRangeStart: timelineRange.start?.toISOString?.()?.split('T')[0] || 'undefined',
        timelineRangeEnd: timelineRange.end?.toISOString?.()?.split('T')[0] || 'undefined',
        currentScale: currentTimelineScale
    });
    
    if (!ganttHeader || !ganttContent || !timelineRange.start || !timelineRange.end) {
        console.warn('⚠️ Cannot render Gantt header - missing elements or timeline range:', {
            missingHeader: !ganttHeader,
            missingContent: !ganttContent,
            missingTimelineStart: !timelineRange.start,
            missingTimelineEnd: !timelineRange.end
        });
        return;
    }
    
    console.log(`📅 Rendering ${currentTimelineScale} timeline header with range: ${timelineRange.start.toISOString().split('T')[0]} to ${timelineRange.end.toISOString().split('T')[0]}`);
    ganttHeader.innerHTML = '';
    
    const scaleConfig = CONFIG.TIMELINE_SCALES[currentTimelineScale];
    const containerWidth = ganttContent.clientWidth;
    
    let timelineWidth, headerContent;
    
    switch (currentTimelineScale) {
        case 'weekly':
            ({ timelineWidth, headerContent } = renderWeeklyHeader(containerWidth, scaleConfig));
            break;
        case 'monthly':
            ({ timelineWidth, headerContent } = renderMonthlyHeader(containerWidth, scaleConfig));
            break;
        default:
            console.error('Unknown timeline scale:', currentTimelineScale);
            return;
    }
    
    // Create timeline container that perfectly fits the available space
    const timelineContainer = document.createElement('div');
    timelineContainer.style.width = `${Math.floor(containerWidth * 0.98)}px`; // Force exact container fit
    timelineContainer.style.height = '120px'; // Updated to accommodate new 60px x 2 headers
    timelineContainer.style.position = 'relative';
    timelineContainer.style.overflow = 'hidden'; // Prevent any overflow
    
    headerContent.forEach(row => {
        // Ensure each row also matches the container width
        row.style.width = `${Math.floor(containerWidth * 0.98)}px`;
        timelineContainer.appendChild(row);
    });
    
    ganttHeader.appendChild(timelineContainer);
    console.log(`✅ ${currentTimelineScale} header rendered with width: ${Math.floor(containerWidth * 0.98)}px (forced fit)`);
}



// Render clean weekly timeline header
function renderWeeklyHeader(containerWidth, scaleConfig) {
    console.log('🗓️ Rendering weekly header with timeline range:', {
        start: timelineRange.start?.toISOString?.()?.split('T')[0] || 'undefined',
        end: timelineRange.end?.toISOString?.()?.split('T')[0] || 'undefined',
        startYear: timelineRange.start?.getFullYear?.(),
        endYear: timelineRange.end?.getFullYear?.()
    });
    
    const weeks = [];
    let currentDate = new Date(timelineRange.start);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Start on Monday
    
    console.log('🏁 Starting week generation from:', currentDate.toISOString().split('T')[0]);
    
    while (currentDate <= timelineRange.end) {
        weeks.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7);
    }
    
    console.log('📅 Generated weeks for header:', weeks.length, 'weeks from', 
        weeks[0]?.toISOString().split('T')[0], 'to', weeks[weeks.length-1]?.toISOString().split('T')[0]);
    
    const totalWeeks = weeks.length;
    
    // FIXED: Use consistent column width that matches unitWidth calculation
    const FIXED_WEEK_WIDTH = 12; // Fixed 12px per week - matches the unitWidth used in positioning
    const calculatedWidth = FIXED_WEEK_WIDTH;
    const timelineWidth = totalWeeks * calculatedWidth;
    
    console.log('📊 Weekly header dimensions:', {
        totalWeeks,
        fixedWeekWidth: FIXED_WEEK_WIDTH,
        calculatedWidth,
        containerWidth,
        timelineWidth,
        yearsSpan: timelineRange.end.getFullYear() - timelineRange.start.getFullYear()
    });
    
    // Month/Year row (top)
    const monthYearRow = document.createElement('div');
    monthYearRow.className = 'timeline-header-row';
    monthYearRow.style.cssText = `
        position: absolute;
        top: 0;
        width: 100%;
        height: 60px;
        background: #f1f5f9;
        border-bottom: 2px solid #d1d5db;
    `;
    
    // Week row (bottom)
    const weekRow = document.createElement('div');
    weekRow.className = 'timeline-header-row';
    weekRow.style.cssText = `
        position: absolute;
        top: 60px;
        width: 100%;
        height: 60px;
        background: #ffffff;
    `;
    
    // Group weeks by month for month/year headers - enhanced for full range
    const monthGroups = [];
    let currentMonthYear = null;
    let monthStart = 0;
    
    weeks.forEach((week, index) => {
        const monthYear = `${week.getFullYear()}-${week.getMonth()}`;
        
        if (monthYear !== currentMonthYear) {
            if (currentMonthYear) {
                monthGroups.push({
                    startIndex: monthStart,
                    endIndex: index - 1,
                    date: weeks[monthStart],
                    weekCount: index - monthStart
                });
            }
            currentMonthYear = monthYear;
            monthStart = index;
        }
    });
    
    // Add the last month group
    if (weeks.length > 0) {
        monthGroups.push({
            startIndex: monthStart,
            endIndex: weeks.length - 1,
            date: weeks[monthStart],
            weekCount: weeks.length - monthStart
        });
    }
    
    console.log('📅 Month groups created:', monthGroups.length, 'groups covering', monthGroups.map(g => g.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })));
    
    // Generate month/year headers - adaptive sizing for full range
    monthGroups.forEach(group => {
        const groupWidth = group.weekCount * calculatedWidth;
        
        const monthYearCell = document.createElement('div');
        monthYearCell.className = 'timeline-header-cell month-year-header';
        monthYearCell.style.cssText = `
            position: absolute;
            left: ${group.startIndex * calculatedWidth}px;
            width: ${groupWidth}px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #d1d5db;
            font-size: ${calculatedWidth < 30 ? '10px' : '14px'};
            font-weight: 600;
            color: #1f2937;
            background: #f1f5f9;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        `;
        
        // Adaptive text based on available width
        let monthYearText;
        if (groupWidth < 40) {
            // Very narrow: just year for every 6th month or so
            if (group.date.getMonth() === 0 || monthGroups.indexOf(group) % 6 === 0) {
                monthYearText = group.date.getFullYear().toString();
            } else {
                monthYearText = group.date.toLocaleDateString('en-US', { month: 'short' });
            }
        } else if (groupWidth < 60) {
            // Narrow: short month + year
            monthYearText = group.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        } else {
            // Wide enough: full month + year
            monthYearText = group.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        
        monthYearCell.textContent = monthYearText;
        monthYearRow.appendChild(monthYearCell);
    });
    
    // Generate week headers - adaptive for readability
    weeks.forEach((week, index) => {
        const weekCell = document.createElement('div');
        weekCell.className = 'timeline-header-cell week-header';
        weekCell.style.cssText = `
            position: absolute;
            left: ${index * calculatedWidth}px;
            width: ${calculatedWidth}px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #e5e7eb;
            font-size: ${calculatedWidth < 20 ? '8px' : '13px'};
            font-weight: 500;
            color: #4b5563;
            background: #ffffff;
            overflow: hidden;
        `;
        
        // Show week start date (Monday) - skip some if too narrow
        if (calculatedWidth >= 15 || index % Math.max(1, Math.floor(20 / calculatedWidth)) === 0) {
            weekCell.textContent = week.getDate().toString();
        }
        weekRow.appendChild(weekCell);
    });
    
    console.log('✅ Weekly header rendering complete:', {
        monthGroupsCreated: monthGroups.length,
        weeksCreated: weeks.length,
        totalWidth: timelineWidth,
        adaptiveWidthPerWeek: calculatedWidth
    });
    
    return { timelineWidth, headerContent: [monthYearRow, weekRow] };
}

// Render clean monthly timeline header
function renderMonthlyHeader(containerWidth, scaleConfig) {
    console.log('🗓️ Rendering monthly header with timeline range:', {
        start: timelineRange.start?.toISOString?.()?.split('T')[0] || 'undefined',
        end: timelineRange.end?.toISOString?.()?.split('T')[0] || 'undefined',
        startYear: timelineRange.start?.getFullYear?.(),
        endYear: timelineRange.end?.getFullYear?.()
    });
    
    const months = [];
    let currentDate = new Date(timelineRange.start.getFullYear(), timelineRange.start.getMonth(), 1);
    
    console.log('🏁 Starting month generation from:', currentDate.toISOString().split('T')[0]);
    
    while (currentDate <= timelineRange.end) {
        months.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    console.log('📅 Generated months for header:', months.map(m => m.toISOString().split('T')[0]).slice(0, 10), `... (${months.length} total)`);
    
    const totalMonths = months.length;
    // Adaptive width calculation - force fit to container width
    const calculatedWidth = Math.max(15, Math.floor((containerWidth * 0.98) / totalMonths)); // Minimum 15px per month
    const timelineWidth = totalMonths * calculatedWidth;
    
    console.log('📊 Monthly header dimensions:', {
        totalMonths,
        calculatedWidth,
        containerWidth,
        timelineWidth,
        yearsSpan: timelineRange.end.getFullYear() - timelineRange.start.getFullYear()
    });
    
    // Year row (top)
    const yearRow = document.createElement('div');
    yearRow.className = 'timeline-header-row';
    yearRow.style.cssText = `
        position: absolute;
        top: 0;
        width: 100%;
        height: 60px;
        background: #f1f5f9;
        border-bottom: 2px solid #d1d5db;
    `;
    
    // Month row (bottom)
    const monthRow = document.createElement('div');
    monthRow.className = 'timeline-header-row';
    monthRow.style.cssText = `
        position: absolute;
        top: 60px;
        width: 100%;
        height: 60px;
        background: #f8f9fa;
    `;
    
    // Generate year headers
    let currentYear = -1;
    let yearStart = 0;
    
    months.forEach((month, index) => {
        if (month.getFullYear() !== currentYear) {
            // Close previous year span
            if (currentYear !== -1) {
                const yearCell = yearRow.children[yearRow.children.length - 1];
                if (yearCell) {
                    const yearWidth = (index - yearStart) * calculatedWidth;
                    yearCell.style.width = `${yearWidth}px`;
                }
            }
            
            currentYear = month.getFullYear();
            yearStart = index;
            
            console.log(`🗓️ Creating year header for: ${currentYear} (starting at month index ${index})`);
            
            // Create year header
            const yearCell = document.createElement('div');
            yearCell.className = 'timeline-header-cell year-header';
            yearCell.style.cssText = `
                position: absolute;
                left: ${index * calculatedWidth}px;
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-right: 1px solid #d1d5db;
                font-size: ${calculatedWidth < 30 ? '12px' : '16px'};
                font-weight: 700;
                color: #1f2937;
                background: #f1f5f9;
                overflow: hidden;
            `;
            yearCell.textContent = currentYear.toString();
            yearRow.appendChild(yearCell);
        }
        
        // Create month header
        const monthCell = document.createElement('div');
        monthCell.className = 'timeline-header-cell month-header';
        monthCell.style.cssText = `
            position: absolute;
            left: ${index * calculatedWidth}px;
            width: ${calculatedWidth}px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #e5e7eb;
            font-size: ${calculatedWidth < 25 ? '10px' : '14px'};
            font-weight: 600;
            color: #374151;
            background: #f8f9fa;
            overflow: hidden;
        `;
        
        // Adaptive month text based on available width
        let monthText;
        if (calculatedWidth < 30) {
            // Very narrow: just first letter
            monthText = month.toLocaleDateString('en-US', { month: 'short' }).charAt(0);
        } else if (calculatedWidth < 50) {
            // Narrow: 3-letter abbreviation
            monthText = month.toLocaleDateString('en-US', { month: 'short' });
        } else {
            // Wide enough: full short month name
            monthText = month.toLocaleDateString('en-US', { month: 'short' });
        }
        
        monthCell.textContent = monthText;
        monthRow.appendChild(monthCell);
    });
    
    // Close last year span
    if (yearRow.children.length > 0) {
        const yearCell = yearRow.children[yearRow.children.length - 1];
        const yearWidth = (totalMonths - yearStart) * calculatedWidth;
        yearCell.style.width = `${yearWidth}px`;
    }
    
    console.log('✅ Monthly header rendering complete:', {
        yearsCreated: yearRow.children.length,
        monthsCreated: monthRow.children.length,
        totalMonths: months.length
    });
    
    return { timelineWidth, headerContent: [yearRow, monthRow] };
}

// Scale-aware Gantt chart rendering with hierarchy and today line
function renderGantt() {
    const ganttContent = document.getElementById('ganttContent');
    if (!ganttContent || !timelineRange.start || !timelineRange.end) return;
    
    console.log(`📊 Rendering ${currentTimelineScale} Gantt chart...`);
    ganttContent.innerHTML = '';
    
    if (hierarchicalData.length === 0) {
        ganttContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No activities with tasks to display</div>';
        return;
    }
    
    // Calculate scale-specific dimensions
    let totalUnits, unitWidth, timelineWidth;
    const containerWidth = ganttContent.clientWidth;
    const scaleConfig = CONFIG.TIMELINE_SCALES[currentTimelineScale];
    
    switch (currentTimelineScale) {
        case 'daily':
            totalUnits = Math.ceil((timelineRange.end - timelineRange.start) / (1000 * 60 * 60 * 24));
            // Force fit to container width to eliminate horizontal scrolling
            unitWidth = Math.floor((containerWidth * 0.98) / totalUnits);
            timelineWidth = totalUnits * unitWidth;
            break;
        case 'weekly':
            const totalDays = Math.ceil((timelineRange.end - timelineRange.start) / (1000 * 60 * 60 * 24));
            totalUnits = Math.ceil(totalDays / 7);
            // FIXED: Use same fixed width as header for consistency
            const FIXED_WEEK_WIDTH = 12; // Must match the header calculation
            unitWidth = FIXED_WEEK_WIDTH;
            timelineWidth = totalUnits * unitWidth;
            break;
        case 'monthly':
            const months = [];
            let currentDate = new Date(timelineRange.start.getFullYear(), timelineRange.start.getMonth(), 1);
            while (currentDate <= timelineRange.end) {
                months.push(new Date(currentDate));
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            totalUnits = months.length;
            // Force fit to container width to eliminate horizontal scrolling
            unitWidth = Math.floor((containerWidth * 0.98) / totalUnits);
            timelineWidth = totalUnits * unitWidth;
            break;
        default:
            console.error('Unknown timeline scale:', currentTimelineScale);
            return;
    }
    
    const totalHeight = hierarchicalData.length * CONFIG.ROW_HEIGHT;
    
    console.log('📏 Scale-aware Gantt dimensions:', {
        scale: currentTimelineScale,
        totalUnits,
        unitWidth,
        timelineWidth,
        containerWidth,
        totalHeight
    });
    
    // Create container for all elements that uses actual timeline width (not clipped)
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = `
        position: relative;
        width: ${timelineWidth}px;
        height: ${totalHeight}px;
        background: linear-gradient(90deg, transparent ${unitWidth - 1}px, #f0f0f0 ${unitWidth - 1}px, #f0f0f0 ${unitWidth}px, transparent ${unitWidth}px);
        background-size: ${unitWidth}px 100%;
        min-width: ${timelineWidth}px;
    `;
    
    // Enhanced today line for all timeline scales - ALWAYS SHOW
    const today = new Date();
    let todayPosition;
    
    switch (currentTimelineScale) {
        case 'daily':
            const daysFromStart = Math.floor((today - timelineRange.start) / (1000 * 60 * 60 * 24));
            todayPosition = daysFromStart * unitWidth;
            break;
        case 'weekly':
            const weekDaysFromStart = Math.floor((today - timelineRange.start) / (1000 * 60 * 60 * 24));
            const weeksFromStart = Math.floor(weekDaysFromStart / 7);
            const dayInWeek = weekDaysFromStart % 7;
            todayPosition = (weeksFromStart * unitWidth) + (dayInWeek * unitWidth / 7);
            break;
        case 'monthly':
            const todayMonth = today.getFullYear() * 12 + today.getMonth();
            const timelineStartMonth = timelineRange.start.getFullYear() * 12 + timelineRange.start.getMonth();
            const monthsFromStart = todayMonth - timelineStartMonth;
            
            // Calculate precise position within month column (even if outside range)
            const dayOfMonth = today.getDate();
            const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const monthProgress = (dayOfMonth - 1) / Math.max(1, daysInCurrentMonth - 1);
            const dayOffset = monthProgress * unitWidth;
            
            todayPosition = (monthsFromStart * unitWidth) + dayOffset;
            
            if (monthsFromStart < 0 || monthsFromStart >= totalUnits) {
                console.log('📅 TODAY marker outside visible timeline range but will still be rendered:', {
                    today: today.toISOString().split('T')[0],
                    timelineStart: timelineRange.start.toISOString().split('T')[0],
                    timelineEnd: timelineRange.end.toISOString().split('T')[0],
                    monthsFromStart,
                    totalUnits,
                    todayPosition: Math.round(todayPosition)
                });
            }
            break;
    }
    
    // ALWAYS create TODAY marker regardless of position
    if (todayPosition !== undefined) {
        // Enhanced today line with dashed style
        const todayLine = document.createElement('div');
        todayLine.style.cssText = `
            position: absolute;
            left: ${todayPosition}px;
            top: 0;
            width: 3px;
            height: 100%;
            border-left: 3px dashed ${CONFIG.COLORS.TODAY_LINE};
            z-index: 100;
            box-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
            pointer-events: none;
        `;
        chartContainer.appendChild(todayLine);
        
        // Enhanced today label with better styling
        const todayLabel = document.createElement('div');
        todayLabel.style.cssText = `
            position: absolute;
            left: ${todayPosition + 6}px;
            top: 5px;
            font-size: 10px;
            font-weight: bold;
            color: white;
            background: ${CONFIG.COLORS.TODAY_LINE};
            padding: 3px 6px;
            border-radius: 4px;
            z-index: 101;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            white-space: nowrap;
        `;
        
        // Show different label based on scale
        switch (currentTimelineScale) {
            case 'daily':
                todayLabel.textContent = `TODAY (${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
                break;
            case 'weekly':
                const weekNumber = Math.ceil((today - timelineRange.start) / (1000 * 60 * 60 * 24 * 7));
                todayLabel.textContent = `TODAY (Week ${weekNumber})`;
                break;
            case 'monthly':
                todayLabel.textContent = `TODAY (${today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;
                break;
        }
        
        chartContainer.appendChild(todayLabel);
        
        // Add a subtle background highlight for today's area
        const todayHighlight = document.createElement('div');
        let highlightWidth;
        
        switch (currentTimelineScale) {
            case 'daily':
                highlightWidth = unitWidth;
                break;
            case 'weekly':
                highlightWidth = unitWidth / 7;
                break;
            case 'monthly':
                const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                highlightWidth = unitWidth / daysInCurrentMonth;
                break;
        }
        
        todayHighlight.style.cssText = `
            position: absolute;
            left: ${todayPosition - highlightWidth/2}px;
            top: 0;
            width: ${highlightWidth}px;
            height: 100%;
            background: rgba(220, 38, 38, 0.05);
            z-index: 50;
            pointer-events: none;
        `;
        chartContainer.appendChild(todayHighlight);
        
        console.log('✅ TODAY marker rendered at position:', {
            todayPosition: Math.round(todayPosition),
            isVisible: todayPosition >= 0 && todayPosition <= totalUnits * unitWidth,
            needsScroll: todayPosition < 0 || todayPosition > totalUnits * unitWidth,
            today: today.toISOString().split('T')[0]
        });
    }
    
    console.log('📏 Scale-aware Gantt dimensions:', { 
        scale: currentTimelineScale,
        totalUnits, 
        unitWidth, 
        timelineWidth, 
        itemCount: hierarchicalData.length,
        timelineStart: timelineRange.start.toISOString().split('T')[0],
        timelineEnd: timelineRange.end.toISOString().split('T')[0],
        containerWidth
    });
    
    let barsCreated = 0;
    hierarchicalData.forEach((item, index) => {
        const bar = createScaleAwareGanttBar(item, index, totalUnits, unitWidth);
        if (bar) {
            chartContainer.appendChild(bar);
            barsCreated++;
        }
    });
    
    ganttContent.appendChild(chartContainer);
    console.log(`✅ ${currentTimelineScale} Gantt rendered with ${barsCreated} bars out of ${hierarchicalData.length} items`);
}

// Scale-aware Gantt bar creation with proper positioning
function createScaleAwareGanttBar(item, index, totalUnits, unitWidth) {
    // Determine dates based on item type
    let startDate, endDate;
    
    if (item.type === 'activity') {
        startDate = item.calculated_start_date;
        endDate = item.calculated_end_date;
    } else {
        // For tasks, get the best available dates
        const taskStart = item.target_start_date || item.act_start_date || item.early_start_date;
        const taskEnd = item.target_end_date || item.act_end_date || item.early_end_date;
        startDate = taskStart ? new Date(taskStart) : null;
        endDate = taskEnd ? new Date(taskEnd) : null;
    }
    
    if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) {
        console.warn('⚠️ Invalid dates for item:', item.Activity_code, { 
            type: item.type,
            startDate: startDate?.toISOString?.() || 'invalid',
            endDate: endDate?.toISOString?.() || 'invalid'
        });
        return null;
    }
    
    // Check if this is a milestone (TT_Mile or TT_FinMile)
    const isMilestone = item.task_type === 'TT_Mile' || item.task_type === 'TT_FinMile';
    
    // Calculate position and width based on current scale
    let left, width;
    
    if (isMilestone) {
        // For milestones, use only start date and set width to milestone size
        switch (currentTimelineScale) {
            case 'daily':
                const daysFromStart = Math.floor((startDate - timelineRange.start) / (1000 * 60 * 60 * 24));
                left = daysFromStart * unitWidth;
                width = 20; // Fixed width for milestone diamond
                break;
                
            case 'weekly':
                const startDays = Math.floor((startDate - timelineRange.start) / (1000 * 60 * 60 * 24));
                const startWeek = Math.floor(startDays / 7);
                const dayInStartWeek = startDays % 7;
                left = (startWeek * unitWidth) + (dayInStartWeek * unitWidth / 7);
                width = 20; // Fixed width for milestone diamond
                break;
                
            case 'monthly':
                const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
                const timelineStartMonth = timelineRange.start.getFullYear() * 12 + timelineRange.start.getMonth();
                const monthsFromStart = startMonth - timelineStartMonth;
                const dayInMonth = startDate.getDate() - 1;
                const daysInStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                const dayOffset = (dayInMonth / daysInStartMonth) * unitWidth;
                left = (monthsFromStart * unitWidth) + dayOffset;
                width = 20; // Fixed width for milestone diamond
                break;
                
            default:
                console.error('Unknown timeline scale:', currentTimelineScale);
                return null;
        }
    } else {
        // For regular tasks and activities, calculate normal bar width
        switch (currentTimelineScale) {
            case 'daily':
                const daysFromStart = Math.floor((startDate - timelineRange.start) / (1000 * 60 * 60 * 24));
                const duration = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
                left = daysFromStart * unitWidth;
                width = Math.max(3, duration * unitWidth); // Minimum 3px for compressed views
                break;
                
            case 'weekly':
                const startDays = Math.floor((startDate - timelineRange.start) / (1000 * 60 * 60 * 24));
                const endDays = Math.floor((endDate - timelineRange.start) / (1000 * 60 * 60 * 24));
                const startWeek = Math.floor(startDays / 7);
                const endWeek = Math.floor(endDays / 7);
                const durationWeeks = Math.max(1, endWeek - startWeek + 1);
                
                // Position at start of week with day offset
                const dayInStartWeek = startDays % 7;
                left = (startWeek * unitWidth) + (dayInStartWeek * unitWidth / 7);
                width = Math.max(3, durationWeeks * unitWidth - (dayInStartWeek * unitWidth / 7)); // Minimum 3px
                break;
                
            case 'monthly':
                const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
                const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();
                const timelineStartMonth = timelineRange.start.getFullYear() * 12 + timelineRange.start.getMonth();
                
                const monthsFromStart = startMonth - timelineStartMonth;
                const durationMonths = Math.max(1, endMonth - startMonth + 1);
                
                // Position within month based on day
                const dayInMonth = startDate.getDate() - 1;
                const daysInStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                const dayOffset = (dayInMonth / daysInStartMonth) * unitWidth;
                
                left = (monthsFromStart * unitWidth) + dayOffset;
                width = Math.max(3, durationMonths * unitWidth - dayOffset); // Minimum 3px
                break;
                
            default:
                console.error('Unknown timeline scale:', currentTimelineScale);
                return null;
        }
    }
    
    // Skip if completely outside visible range
    if (left < -width || left > totalUnits * unitWidth + width) {
        return null;
    }
    
    // Create bar container with calculated positions
    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${index * CONFIG.ROW_HEIGHT + CONFIG.BAR_MARGIN}px;
        width: ${width}px;
        height: ${CONFIG.BAR_HEIGHT}px;
    `;
    
    // Determine bar color and style based on type and task_type
    let barColor, borderColor;
    
    if (isMilestone) {
        // Milestone colors based on task_type
        if (item.task_type === 'TT_Mile') {
            barColor = CONFIG.COLORS.MILESTONE; // Orange
        } else if (item.task_type === 'TT_FinMile') {
            barColor = CONFIG.COLORS.FINISH_MILESTONE; // Pink
        }
        borderColor = 'rgba(0,0,0,0.3)';
    } else if (item.type === 'activity') {
        // Activities: Use color from JSON data, fallback to gray if not available
        if (item.color) {
            // Ensure color has # prefix if not present
            barColor = item.color.startsWith('#') ? item.color : `#${item.color}`;
            
            // Adjust opacity based on progress for visual feedback
            const progress = item.progress || 0;
            if (progress >= 75) {
                // High completion: Use full opacity
                barColor = barColor;
            } else if (progress >= 25) {
                // Medium completion: Add slight transparency
                barColor = barColor + 'E6'; // 90% opacity
            } else {
                // Low completion: Add more transparency
                barColor = barColor + 'CC'; // 80% opacity
            }
        } else {
            // Fallback to gray colors if no color in JSON
            const progress = item.progress || 0;
            if (progress >= 75) {
                barColor = CONFIG.COLORS.ACTIVITY_HIGH_PROGRESS; // Dark gray for high completion
            } else if (progress >= 25) {
                barColor = CONFIG.COLORS.ACTIVITY_MEDIUM_PROGRESS; // Medium gray for medium completion
            } else {
                barColor = CONFIG.COLORS.ACTIVITY_LOW_PROGRESS; // Light gray for low completion
            }
        }
        borderColor = 'rgba(0,0,0,0.2)';
    } else {
        // Regular tasks: Red for critical, Blue for non-critical
        barColor = item.isCritical || item.driving_path_flag === 'Y' ? CONFIG.COLORS.CRITICAL : CONFIG.COLORS.TASK;
        borderColor = 'rgba(0,0,0,0.15)';
    }
    
    // Create main bar or milestone diamond
    const mainBar = document.createElement('div');
    
    if (isMilestone) {
        // Create diamond shape for milestones
        mainBar.style.cssText = `
            position: relative;
            width: 20px;
            height: 20px;
            background: ${barColor};
            border: 2px solid ${borderColor};
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transform: rotate(45deg);
            margin-top: -1px;
            margin-left: -2px;
        `;
    } else {
        // Create regular bar for tasks and activities
        mainBar.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            background: ${barColor};
            border: 1px solid ${borderColor};
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        `;
        
        // Add progress overlay for non-milestones
        if (item.progress && item.progress > 0) {
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: ${item.progress}%;
                height: 100%;
                background: ${CONFIG.COLORS.PROGRESS};
                border-radius: 3px;
                z-index: 1;
            `;
            mainBar.appendChild(progressBar);
        }
    }
    
    // Create external label for tasks (positioned outside the bar)
    if (!isMilestone && item.type !== 'activity') {
        const externalLabel = document.createElement('div');
        externalLabel.style.cssText = `
            position: absolute;
            left: ${width + 5}px;
            top: 50%;
            transform: translateY(-50%);
            color: #374151;
            font-size: 9px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 3;
            background: rgba(255, 255, 255, 0.9);
            padding: 1px 4px;
            border-radius: 2px;
            border: 1px solid #e5e7eb;
        `;
        externalLabel.textContent = item.Activity_name || item.Activity_code || 'Unnamed';
        barContainer.appendChild(externalLabel);
    }
    
    // Add internal label for wide bars (activities and wide tasks)
    if (!isMilestone) {
        let labelThreshold;
        switch (currentTimelineScale) {
            case 'daily': labelThreshold = 30; break;
            case 'weekly': labelThreshold = 40; break;
            case 'monthly': labelThreshold = 50; break;
            default: labelThreshold = 30;
        }
        
        if (width > labelThreshold && item.type === 'activity') {
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute;
                left: 3px;
                top: 50%;
                transform: translateY(-50%);
                color: white;
                font-size: 10px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: ${width - 6}px;
                text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
                z-index: 2;
            `;
            label.textContent = item.Activity_name || item.Activity_code || 'Unnamed';
            mainBar.appendChild(label);
        }
        
        // Add duration label for wider bars
        if (width > labelThreshold + 20) {
            const durationLabel = document.createElement('div');
            durationLabel.style.cssText = `
                position: absolute;
                right: 3px;
                top: 1px;
                color: white;
                font-size: 7px;
                font-weight: 500;
                text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
                z-index: 2;
            `;
            
            // Calculate duration based on scale
            let durationText;
            switch (currentTimelineScale) {
                case 'daily':
                    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                    durationText = `${days}d`;
                    break;
                case 'weekly':
                    const weeks = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7));
                    durationText = `${weeks}w`;
                    break;
                case 'monthly':
                    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                  (endDate.getMonth() - startDate.getMonth()) + 1;
                    durationText = `${months}m`;
                    break;
                default:
                    durationText = '';
            }
            
            durationLabel.textContent = durationText;
            mainBar.appendChild(durationLabel);
        }
    }
    
    // Add hover effects
    mainBar.addEventListener('mouseenter', () => {
        if (isMilestone) {
            mainBar.style.transform = 'rotate(45deg) scale(1.2)';
            mainBar.style.boxShadow = '0 3px 8px rgba(0,0,0,0.3)';
        } else {
            mainBar.style.transform = 'translateY(-1px)';
            mainBar.style.boxShadow = '0 3px 8px rgba(0,0,0,0.2)';
        }
        showTooltip(item, barContainer);
    });
    
    mainBar.addEventListener('mouseleave', () => {
        if (isMilestone) {
            mainBar.style.transform = 'rotate(45deg) scale(1)';
            mainBar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        } else {
            mainBar.style.transform = 'translateY(0)';
            mainBar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
        hideTooltip();
    });
    
    // Add click handler
    mainBar.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`📝 ${isMilestone ? 'Milestone' : item.type} clicked (${currentTimelineScale} view):`, {
            code: item.Activity_code,
            name: item.Activity_name,
            task_type: item.task_type,
            start: startDate.toLocaleDateString(),
            end: endDate.toLocaleDateString(),
            progress: item.progress || 0
        });
    });
    
    barContainer.appendChild(mainBar);
    return barContainer;
}

// Show tooltip on hover
function showTooltip(item, container) {
    hideTooltip(); // Remove any existing tooltip
    
    const tooltip = document.createElement('div');
    tooltip.id = 'gantt-tooltip';
    
    // Get the Gantt content container for proper positioning
    const ganttContent = document.getElementById('ganttContent');
    const ganttRect = ganttContent.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position relative to gantt content
    const relativeTop = containerRect.top - ganttRect.top;
    const relativeLeft = containerRect.left - ganttRect.left;
    
    // Smart positioning: show above if there's space, below if not
    const tooltipTop = relativeTop > 50 ? relativeTop - 45 : relativeTop + CONFIG.BAR_HEIGHT + 8;
    
    // Smart horizontal positioning: avoid going outside visible area
    let tooltipLeft = relativeLeft + 10;
    if (tooltipLeft + 300 > ganttContent.scrollWidth) {
        tooltipLeft = relativeLeft - 310; // Show to the left of the bar
    }
    
    tooltip.style.cssText = `
        position: absolute;
        top: ${tooltipTop}px;
        left: ${tooltipLeft}px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 9999;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Get dates based on item type with proper field names
    let startDate, endDate, dateTypeLabel = '';
    
    if (item.type === 'activity') {
        startDate = item.calculated_start_date;
        endDate = item.calculated_end_date;
        dateTypeLabel = 'Calculated';
    } else {
        // For tasks, use the same logic as in bar creation
        const taskStart = item.target_start_date || item.act_start_date || item.early_start_date;
        const taskEnd = item.target_end_date || item.act_end_date || item.early_end_date;
        
        startDate = taskStart ? new Date(taskStart) : null;
        endDate = taskEnd ? new Date(taskEnd) : null;
        
        // Determine which date type we're showing
        if (item.target_start_date && item.target_end_date) {
            dateTypeLabel = 'Target';
        } else if (item.act_start_date && item.act_end_date) {
            dateTypeLabel = 'Actual';
        } else if (item.early_start_date && item.early_end_date) {
            dateTypeLabel = 'Early';
        } else {
            dateTypeLabel = 'Scheduled';
        }
    }
    
    // Format dates safely
    const startDateStr = startDate && !isNaN(startDate) ? startDate.toLocaleDateString() : 'No Start Date';
    const endDateStr = endDate && !isNaN(endDate) ? endDate.toLocaleDateString() : 'No End Date';
    
    // Determine item display type
    let itemType = '';
    if (item.task_type === 'TT_Mile') {
        itemType = '◆ Start Milestone';
    } else if (item.task_type === 'TT_FinMile') {
        itemType = '◆ Finish Milestone';
    } else if (item.task_type === 'TT_Task') {
        itemType = '■ Task';
    } else if (item.type === 'activity') {
        itemType = '▶ Activity';
    } else {
        itemType = '■ Item';
    }

    tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${item.Activity_name || item.task_name || 'Unnamed'}</div>
        <div style="font-size: 11px; opacity: 0.9;">
            <div style="margin-bottom: 2px;">Type: ${itemType}</div>
            <div style="margin-bottom: 2px;">${dateTypeLabel}: ${startDateStr} - ${endDateStr}</div>
            <div style="margin-bottom: 2px;">Progress: ${item.progress || item.phys_complete_pct || 0}% complete</div>
            ${item.duration_days ? `<div style="margin-bottom: 2px;">Duration: ${item.duration_days} days</div>` : ''}
            ${item.task_code ? `<div style="margin-bottom: 2px;">Code: ${item.task_code}</div>` : ''}
            ${item.task_type ? `<div style="margin-bottom: 2px;">Task Type: ${item.task_type}</div>` : ''}
            ${item.isCritical || item.driving_path_flag === 'Y' ? '<div style="color: #FCA5A5;">🔴 Critical Path</div>' : ''}
            ${item.type === 'activity' && item.hasCriticalPath ? '<div style="color: #FCA5A5;">⚡ Contains Critical Tasks</div>' : ''}
        </div>
    `;
    
    ganttContent.appendChild(tooltip);
}

// Hide tooltip
function hideTooltip() {
    const existing = document.getElementById('gantt-tooltip');
    if (existing) {
        existing.remove();
    }
}

// Toggle expand/collapse for activities
function toggleExpand(awpId) {
    console.log('🔄 Toggling expand for AWP:', awpId);
    
    if (expandedNodes.has(awpId)) {
        expandedNodes.delete(awpId);
    } else {
        expandedNodes.add(awpId);
    }
    
    // Rebuild hierarchy and re-render
    buildEnhancedHierarchy();
    renderAll();
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function showLoading() {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    }
}

function showError(message) {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> ${message}</td></tr>`;
    }
}

function clearData() {
    awpData = [];
    hierarchicalData = [];
    selectedAwpId = null;
    filteredTasks = [];
    expandedNodes.clear();
    currentProjectId = null;
    
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #6b7280;">Select a project to view AWP data</td></tr>';
    }
    
    const ganttHeader = document.getElementById('ganttHeader');
    if (ganttHeader) ganttHeader.innerHTML = '';
    
    const ganttContent = document.getElementById('ganttContent');
    if (ganttContent) ganttContent.innerHTML = '';
    
    updateCountDisplay();
}

// Update count display with hierarchy information
function updateCountDisplay() {
    const activities = hierarchicalData.filter(item => item.type === 'activity').length;
    const tasks = hierarchicalData.filter(item => item.type === 'task').length;
    const activitiesWithTasks = hierarchicalData.filter(item => item.type === 'activity' && item.hasDescendantTasks).length;
    const activitiesWithoutTasks = hierarchicalData.filter(item => item.type === 'activity' && !item.hasDescendantTasks).length;
    const visibleCount = hierarchicalData.length;
    
    const visibleElement = document.getElementById('visibleCount');
    const totalElement = document.getElementById('totalCount');
    
    if (visibleElement) visibleElement.textContent = visibleCount;
    if (totalElement) totalElement.textContent = `${activities} activities`;
    
    // Update status to show hierarchy information
    const statusElement = document.querySelector('.text-sm.text-gray-600');
    if (statusElement) {
        if (activities > 0) {
            statusElement.textContent = `AWP Hierarchy: ${activities} total activities (${activitiesWithTasks} with tasks, ${activitiesWithoutTasks} parent-only), ${tasks} tasks shown`;
        } else {
            statusElement.textContent = 'AWP Hierarchy - Select a project to view data';
        }
    }
}

// Setup timeline slicer controls
function setupTimelineSlicerControls() {
    // Set up event listeners for the timeline buttons (Daily removed)
    const weeklyBtn = document.getElementById('weeklyBtn');
    const monthlyBtn = document.getElementById('monthlyBtn');
    
    if (weeklyBtn) {
        weeklyBtn.addEventListener('click', () => switchTimelineScale('weekly'));
    }
    if (monthlyBtn) {
        monthlyBtn.addEventListener('click', () => switchTimelineScale('monthly'));
    }
    
    // Initialize with weekly scale (Daily removed)
    switchTimelineScale('weekly');
    
    console.log('✅ Timeline slicer controls initialized');
}

// Switch timeline scale
function switchTimelineScale(newScale) {
    if (newScale === currentTimelineScale) return;
    
    console.log(`🔄 Switching timeline scale from ${currentTimelineScale} to ${newScale}`);
    
    currentTimelineScale = newScale;
    
    // Update button states using the correct HTML button IDs (Daily removed)
    const weeklyBtn = document.getElementById('weeklyBtn');
    const monthlyBtn = document.getElementById('monthlyBtn');
    
    console.log('📝 Button elements found:', { weeklyBtn: !!weeklyBtn, monthlyBtn: !!monthlyBtn });
    
    // AGGRESSIVE RESET: Force remove active class and reset attributes
    [weeklyBtn, monthlyBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('timeline-btn-active');
            btn.className = btn.className.replace(/timeline-btn-active/g, '').trim();
            if (!btn.className.includes('timeline-btn')) {
                btn.className = 'timeline-btn';
            }
            console.log(`🗑️ Aggressively reset button:`, btn.id, 'classes:', btn.className);
        }
    });
    
    // Set active button with force
    let activeBtn;
    switch (newScale) {
        case 'weekly':
            activeBtn = weeklyBtn;
            break;
        case 'monthly':
            activeBtn = monthlyBtn;
            break;
    }
    
    if (activeBtn) {
        activeBtn.className = 'timeline-btn timeline-btn-active';
        console.log(`✅ Force-set active button:`, activeBtn.id, 'classes:', activeBtn.className);
    }
    
    // Log final button states for debugging
    if (weeklyBtn && monthlyBtn) {
        console.log('📊 Final button states:', {
            weekly: weeklyBtn.classList.contains('timeline-btn-active'),
            monthly: monthlyBtn.classList.contains('timeline-btn-active'),
            weeklyClasses: weeklyBtn.className,
            monthlyClasses: monthlyBtn.className
        });
    }
    
    // Update timeline range with scale-aware padding
    calculateOptimalTimelineRange();
    
    // Re-render timeline with new scale
    if (hierarchicalData.length > 0) {
        renderGanttHeader();
        renderGantt();
    }
    
    console.log(`✅ Timeline scale switched to ${newScale}`);
}
