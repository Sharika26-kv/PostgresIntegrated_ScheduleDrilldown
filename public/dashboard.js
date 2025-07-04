// Dashboard functionality

let currentPage = 1;
let pageSize = 100;
let totalRows = 0;
let totalPages = 1;
let lastProjectId = null;
let allTasksData = []; // Store the full dataset
let processedTasksData = []; // Store processed data for filtering and display

// --- AWP Mapping Data ---
const AWP_LEVEL1_MAPPING = { 
    'Admin': ['Admin'],
    'Colo01': ['Colo01', 'COLO1', 'Colo1'],
    'Colo02': ['Colo02', 'COLO2', 'Colo2'],
    'Colo03': ['Colo03', 'COLO3', 'Colo3'],
    'Colo04': ['Colo04', 'COLO4', 'Colo4'],
    'Colo05': ['Colo05', 'COLO5', 'Colo5']
};

const AWP_LEVEL2_MAPPING = { 
    'WT': ['Weather Tight', 'WT'],
    'L1': ['Commissioning Level 1 Red Tag', 'L1'],
    'L2': ['Commissioning Level 2 Yellow Tag', 'L2'],
    'L3': ['Commissioning Level 3 Green Tag', 'L3'],
    'L4': ['Commissioning Level 4 Blue Tag', 'L4'],
    'L5': ['Commissioning Level 5', 'System Test White Tag', 'L5'],
    'SC': ['Substantial Completion', 'SC']
};

const AWP_LEVEL3_MAPPING = { 
    'OA': ['Outside Area', 'OA'],
    'BD': ['Main Building', 'BD'],
    'CB': ['Central Utility Building', 'CB'],
    'CP': ['Central Utility Plant', 'CP'],
    'SS': ['Substation', 'SS'],
    'GN': ['Generator Yard', 'GN'],
    'FT': ['Fuel Tank Area', 'FT'],
    'WTA': ['Water Treatment Area', 'WTA']
};

const AWP_LEVEL4_MAPPING = { 
    'UG': ['Underground', 'UG'],
    'F1': ['First Level', 'F1'],
    'F2': ['Second Level', 'F2'],
    'F3': ['Third Level', 'F3'],
    'F4': ['Fourth Level', 'F4'],
    'F5': ['Fifth Level', 'F5'],
    'F6': ['Sixth Level', 'F6']
};

const AWP_LEVEL5_MAPPING = { 
    'CIV': ['Civil', 'CIV'],
    'STR': ['Structural', 'STR'],
    'ARC': ['Architecture', 'ARC'],
    'ELE': ['Electrical', 'ELE'],
    'MEC': ['Mechanical', 'MEC'],
    'PLB': ['Plumbing', 'PLB'],
    'TEL': ['Telecomm', 'TEL'],
    'FPR': ['Fire Protection', 'FPR'],
    'FAL': ['Fire Alarm', 'FAL'],
    'BAS': ['Building Automation', 'BAS'],
    'SEC': ['Security', 'SEC'],
    'LAN': ['Landscape', 'LAN'],
    'CXM': ['Commissioning', 'CXM']
};

const AWP_LEVEL6_MAPPING = { 
    'FDW': ['Foundation', 'FDW'],
    'SOG': ['Slab on Grade', 'SOG'],
    'EEP': ['Exterior Equipment', 'EEP'],
    'UDU': ['Underground Duct', 'UDU'],
    'UWU': ['Underground Wire', 'UWU'],
    'MSC': ['Miscellaneous', 'MSC'],
    'ENV': ['Envelope', 'ENV'],
    'EES': ['Exterior Equipment Support', 'EES'],
    'EFN': ['Exterior Finish', 'EFN'],
    'IFN': ['Interior Finish', 'IFN'],
    'ACT': ['Acoustical', 'ACT'],
    'HAC': ['Hot Aisle Containment', 'HAC'],
    'USI': ['Under Slab', 'USI'],
    'RGH': ['Rough-In', 'RGH'],
    'CTM': ['Cable Tray Main', 'CTM'],
    'CTD': ['Cable Tray Distribution', 'CTD'],
    'CPL': ['Cable Pulling', 'CPL'],
    'CTR': ['Cable Termination', 'CTR'],
    'ACC': ['Air Cooled Condenser', 'ACC'],
    'BTM': ['Basket Tray', 'BTM'],
    'DAS': ['Digital Antenna', 'DAS'],
    'NPF': ['Non-production Facility', 'NPF'],
    'PRF': ['Production Facility', 'PRF'],
    'INS': ['Installation', 'INS'],
    'L1R': ['Level 1 - Red Tag', 'L1R'],
    'L2I': ['Level 2 - Mechanical', 'L2I'],
    'L2P': ['Level 2 - Power', 'L2P'],
    'L2C': ['Level 2 - Controls', 'L2C'],
    'L2Y': ['Level 2 - Yellow Tag', 'L2Y'],
    'L3S': ['Level 3 - Safety', 'L3S'],
    'L3L': ['Level 3 - Load', 'L3L'],
    'L3B': ['Level 3 - Balance', 'L3B'],
    'L3E': ['Level 3 - Electrical', 'L3E'],
    'L3V': ['Level 3 - Verification', 'L3V'],
    'L3G': ['Level 3 - Green Tag', 'L3G'],
    'L4B': ['Level 4 - Blue Tag', 'L4B'],
    'L5W': ['Level 5 - White Tag', 'L5W']
};

// --- AWP Helper Functions (Adapted from compliance.js) ---

// Helper function to parse hierarchy path (handling both > and - delimiters)
function parseHierarchyPath(path) {
    if (!path) return [];
    
    // Split by '>' first, then by '-' within each segment
    return path.split(' > ')
        .flatMap(segment => segment.split('-').map(s => s.trim()))
        .filter(s => s !== ''); // Remove empty strings
}

// Generic AWP level getter function (adapted)
function getAWPLevelGeneric(mapping, taskData) {
    if (!taskData) return 'Unmapped';
    
    // Try to get from awp_path segments first
    if (taskData.awp_path) {
        const awpSegments = parseHierarchyPath(taskData.awp_path);
        for (const [level, patterns] of Object.entries(mapping)) {
            if (!Array.isArray(patterns)) continue;
            for (const pattern of patterns) {
                const upperPattern = String(pattern).toUpperCase();
                if (awpSegments.some(segment => segment.toUpperCase() === upperPattern)) {
                    return level;
                }
            }
        }
    }

    // If not found in awp_path, try wbs_path segments
    if (taskData.wbs_path) {
         const wbsSegments = parseHierarchyPath(taskData.wbs_path);
         for (const [level, patterns] of Object.entries(mapping)) {
            if (!Array.isArray(patterns)) continue;
            for (const pattern of patterns) {
                const upperPattern = String(pattern).toUpperCase();
                if (wbsSegments.some(segment => segment.toUpperCase() === upperPattern)) {
                    return level;
                }
            }
        }
    }

    // Fallback: try task_code or task_name if needed (less reliable for hierarchy levels)
    // ... (Add fallback logic if necessary, adapting from compliance.js's getAWPLevelGeneric)

    return 'Unmapped';
}

// Specific AWP level getter functions for dashboard data structure
function getArea(taskData) { return getAWPLevelGeneric(AWP_LEVEL3_MAPPING, taskData); }
function getMilestone(taskData) { return getAWPLevelGeneric(AWP_LEVEL2_MAPPING, taskData); } // Assuming Milestone maps to Level 2
function getDiscipline(taskData) { return getAWPLevelGeneric(AWP_LEVEL5_MAPPING, taskData); } // Assuming Discipline maps to Level 5

// Function to process tasks and add AWP-based fields
function processTasks(tasks) {
    return tasks.map(task => ({
        ...task, // Keep existing fields
        Area: getArea(task),
        Milestone: getMilestone(task),
        Discipline: getDiscipline(task)
    }));
}

// Function to load projects into the dropdown
async function loadProjects() {
    try {
        const response = await fetch('/api/database/projects');
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        const projects = await response.json();
        
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter) {
            // Clear existing options
            projectFilter.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a project...';
            projectFilter.appendChild(defaultOption);
            
            // Add project options
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.proj_id;
                option.textContent = project.proj_name;
                projectFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Function to load a page of tasks
async function loadTaskPage(projectId, page) {
    if (!projectId) return;
    const offset = (page - 1) * pageSize;
    try {
        const response = await fetch(`/api/tasks/hierarchical?projectId=${projectId}&limit=${pageSize}&offset=${offset}`);
        if (!response.ok) {
            throw new Error('Failed to fetch tasks');
        }
        const result = await response.json();
        totalRows = result.total;
        totalPages = Math.ceil(totalRows / pageSize) || 1;
        allTasksData = result.data; // Store the fetched data
        processedTasksData = processTasks(allTasksData); // Process the data
        updateTaskTable(processedTasksData);
        updatePaginationControls();
        updateDataCards(processedTasksData); // Update cards with processed data
        populateFilterOptions(processedTasksData); // Populate filters with processed data
    } catch (error) {
        console.error('Error loading paginated tasks:', error);
    }
}

// Function to update pagination controls
function updatePaginationControls() {
    let paginationDiv = document.getElementById('dashboard-pagination');
    if (!paginationDiv) {
        // Create it if not present
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'dashboard-pagination';
        paginationDiv.className = 'flex items-center justify-end space-x-2 mt-2';
        const tableContainer = document.querySelector('.bg-white.rounded-lg.shadow.mb-6');
        if (tableContainer) {
            tableContainer.appendChild(paginationDiv);
        }
    }
    paginationDiv.innerHTML = '';
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.className = 'px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            loadTaskPage(lastProjectId, currentPage);
        }
    };
    paginationDiv.appendChild(prevBtn);
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalRows} rows)`;
    pageInfo.className = 'text-sm text-gray-600 px-2';
    paginationDiv.appendChild(pageInfo);
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadTaskPage(lastProjectId, currentPage);
        }
    };
    paginationDiv.appendChild(nextBtn);
}

// Update handleProjectSelection to use pagination
async function handleProjectSelection(projectId) {
    if (!projectId) return;
    lastProjectId = projectId;
    currentPage = 1;
    await loadTaskPage(projectId, currentPage);
    // Update project ID display
    const projectIdDisplay = document.getElementById('currentProjectId');
    if (projectIdDisplay) {
        projectIdDisplay.textContent = projectId;
    }
}

// Function to update the task table with the query results
function updateTaskTable(tasks) {
    const tableBody = document.getElementById('component-schedule-table');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add new rows
    tasks.forEach(task => {
        const row = document.createElement('tr');
        
        // Helper function to format dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            const options = { year: 'numeric', month: 'short', day: '2-digit' };
            return new Date(dateStr).toLocaleDateString(undefined, options);
        };
        
        // Get the start and end dates based on status
        const startDate = task.start_date; // Use the start_date from the API response
        const endDate = task.end_date; // Use the end_date from the API response
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${task.wbs_path || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${task.task_code || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${task.awp_path || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${task.task_id || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${task.task_name || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(startDate)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(endDate)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${task.float || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${task.critical_path === 'Y' ? 'Yes' : 'No'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function updateDataCards(tasks) {
    let earliestStartDate = null;
    let latestEndDate = null;
    let criticalActivitiesCount = 0;
    let totalFloat = 0;

    tasks.forEach(task => {
        // Calculate Start Date (earliest)
        if (task.start_date) {
            const startDate = new Date(task.start_date);
            if (!earliestStartDate || startDate < earliestStartDate) {
                earliestStartDate = startDate;
            }
        }

        // Calculate End Date (latest)
        if (task.end_date) {
            const endDate = new Date(task.end_date);
            if (!latestEndDate || endDate > latestEndDate) {
                latestEndDate = endDate;
            }
        }

        // Count Critical Activities
        if (task.critical_path === 'Y') {
            criticalActivitiesCount++;
        }

        // Sum Total Float - ensure float is a number
        const floatValue = parseFloat(task.float);
        if (!isNaN(floatValue)) {
            totalFloat += floatValue;
        }
    });

    // Format dates
    const formatDate = (date) => {
        if (!date) return '-';
        const options = { year: 'numeric', month: 'short', day: '2-digit' };
        return date.toLocaleDateString(undefined, options);
    };

    // Update the DOM elements
    const startDateCard = document.getElementById('cardStartDate');
    if (startDateCard) {
        startDateCard.textContent = formatDate(earliestStartDate);
    }

    const endDateCard = document.getElementById('cardEndDate');
    if (endDateCard) {
        endDateCard.textContent = formatDate(latestEndDate);
    }

    const totalCriticalActivitiesCard = document.getElementById('cardTotalCriticalActivities');
    if (totalCriticalActivitiesCard) {
        totalCriticalActivitiesCard.textContent = criticalActivitiesCount;
    }

    const totalFloatCard = document.getElementById('cardTotalFloat');
    if (totalFloatCard) {
        totalFloatCard.textContent = totalFloat.toFixed(2); // Format to 2 decimal places
    }
}

// Function to populate filter dropdowns
function populateFilterOptions(tasks) {
    const areaFilter = document.getElementById('areaFilter');
    const milestoneFilter = document.getElementById('milestoneFilter');
    const disciplineFilter = document.getElementById('disciplineFilter');

    if (!areaFilter || !milestoneFilter || !disciplineFilter) return;

    // Clear existing options (keeping the default 'All' option)
    areaFilter.innerHTML = '<option value="">All Areas</option>';
    milestoneFilter.innerHTML = '<option value="">All Milestones</option>';
    disciplineFilter.innerHTML = '<option value="">All Disciplines</option>';

    const areas = new Set();
    const milestones = new Set();
    const disciplines = new Set();

    tasks.forEach(task => {
        // Use the processed AWP fields
        if (task.Area && task.Area !== 'Unmapped') areas.add(task.Area);
        if (task.Milestone && task.Milestone !== 'Unmapped') milestones.add(task.Milestone);
        if (task.Discipline && task.Discipline !== 'Unmapped') disciplines.add(task.Discipline);
    });

    // Sort and add options
    Array.from(areas).sort().forEach(area => {
        areaFilter.innerHTML += `<option value="${area}">${area}</option>`;
    });
    Array.from(milestones).sort().forEach(milestone => {
        milestoneFilter.innerHTML += `<option value="${milestone}">${milestone}</option>`;
    });
     Array.from(disciplines).sort().forEach(discipline => {
        disciplineFilter.innerHTML += `<option value="${discipline}">${discipline}</option>`;
    });
}

// Function to filter tasks based on selected filters and search input
function filterTasks() {
    const areaFilter = document.getElementById('areaFilter');
    const milestoneFilter = document.getElementById('milestoneFilter');
    const disciplineFilter = document.getElementById('disciplineFilter');
    const searchInput = document.querySelector('input[placeholder="Search activities..."]');

    if (!areaFilter || !milestoneFilter || !disciplineFilter || !searchInput) return;

    const selectedArea = areaFilter.value;
    const selectedMilestone = milestoneFilter.value;
    const selectedDiscipline = disciplineFilter.value;
    const searchTerm = searchInput.value.toLowerCase();

    const filteredTasks = processedTasksData.filter(task => {
        const matchesArea = !selectedArea || (task.Area === selectedArea);
        const matchesMilestone = !selectedMilestone || (task.Milestone === selectedMilestone);
        const matchesDiscipline = !selectedDiscipline || (task.Discipline === selectedDiscipline);
        const matchesSearch = !searchTerm || 
                              (task.task_code && task.task_code.toLowerCase().includes(searchTerm)) ||
                              (task.task_name && task.task_name.toLowerCase().includes(searchTerm)) ||
                              (task.wbs_path && task.wbs_path.toLowerCase().includes(searchTerm)) ||
                              (task.awp_path && task.awp_path.toLowerCase().includes(searchTerm));

        return matchesArea && matchesMilestone && matchesDiscipline && matchesSearch;
    });

    // Update the table with filtered data
    updateTaskTable(filteredTasks);
    // Note: Pagination controls and data cards are not updated based on client-side filtering
    // They still reflect the total data from the last API call.
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load projects into dropdown
    loadProjects();
    
    // Add event listener for project selection
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
        projectFilter.addEventListener('change', (e) => {
            const selectedProjectId = e.target.value;
            if (selectedProjectId) {
                handleProjectSelection(selectedProjectId);
            }
        });
    }
    
    // Add event listener for refresh button
    const refreshProjectBtn = document.getElementById('refreshProjectBtn');
    if (refreshProjectBtn) {
        refreshProjectBtn.addEventListener('click', () => {
            const projectFilter = document.getElementById('projectFilter');
            if (projectFilter && projectFilter.value) {
                handleProjectSelection(projectFilter.value);
            }
        });
    }

    // Add event listeners for filter dropdowns and search input
    const areaFilter = document.getElementById('areaFilter');
    const milestoneFilter = document.getElementById('milestoneFilter');
    const disciplineFilter = document.getElementById('disciplineFilter');
    const searchInput = document.querySelector('input[placeholder="Search activities..."]');

    if (areaFilter) areaFilter.addEventListener('change', filterTasks);
    if (milestoneFilter) milestoneFilter.addEventListener('change', filterTasks);
    if (disciplineFilter) disciplineFilter.addEventListener('change', filterTasks);
    if (searchInput) searchInput.addEventListener('input', filterTasks); // Use 'input' for live search
});
