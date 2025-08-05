// Schedule Drilldown JavaScript - Integrated with Nirman Portfolio Management

let currentChart = null;
let currentHistoryChart = null;
let currentMetric = null;
let currentProjectId = null;

// API Base URL - Updated to use current server port
const API_BASE = window.location.origin;

// Pagination state
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;
let pageSize = 50; // Records per page
let allTableData = []; // Store all data for pagination

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Update last updated time
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
        
        // Load projects
        await loadProjects();
        
        // Set up event listeners
        setupEventListeners();
        setupPaginationEventListeners();
        
        console.log('Schedule Drilldown initialized successfully');
    } catch (error) {
        console.error('Error initializing Schedule Drilldown:', error);
        showError('Failed to initialize application');
    }
}

function setupEventListeners() {
    // Initialize all metric cards with proper border styling
    document.querySelectorAll('.metric-card').forEach(card => {
        // Set initial styles
        card.style.border = '1px solid transparent';
        card.style.transition = 'all 0.2s ease-in-out';
        card.style.padding = '4px';  // Consistent padding
        card.style.margin = '0';     // Remove margin
        card.style.gap = '0';        // Remove gap
        card.style.minWidth = '0';   // Allow cards to shrink if needed
        card.style.flexGrow = '1';   // Allow cards to grow equally
        card.style.flexBasis = '0';  // Equal base size for all cards
        card.style.height = 'auto';  // Let height adjust to content
        
        // Add hover state
        card.addEventListener('mouseenter', function() {
            console.log('Hovering over metric:', this.dataset.metric);
            const metric = this.dataset.metric;
            const colorMap = {
                'leads': '#3B82F6',      // blue-500
                'lags': '#10B981',       // green-500
                'excessive-lags': '#F97316', // orange-500
                'fs': '#8B5CF6',         // purple-500
                'non-fs': '#EF4444',     // red-500
                'open-ends': '#14B8A6',  // teal-500
                'constraints': '#6366F1', // indigo-500
                'excessive-durations': '#9333EA',  // purple-600
                'negative-float': '#2563EB',  // blue-600
                'critical-float': '#FBBF24',  // amber-400
                'excessive-float': '#DC2626',  // red-600
                'invalid-dates': '#EF4444',  // red-500
                'riding-data-date': '#3B82F6',  // blue-500
                'resources': '#000000'  // black
            };
            
            if (colorMap[metric]) {
                this.style.border = `1px solid ${colorMap[metric]}`; // Thinner border on hover
            }
        });

        card.addEventListener('mouseleave', function() {
            console.log('Mouse leaving metric:', this.dataset.metric);
            if (this.dataset.metric !== currentMetric) {
                this.style.border = '1px solid transparent';
            }
        });

        // Click event
        card.addEventListener('click', function() {
            console.log('Clicked metric:', this.dataset.metric);
            const metric = this.dataset.metric;
            selectMetric(metric);
        });
    });

    // Update the grid container styles
    const gridContainer = document.querySelector('.grid');
    if (gridContainer) {
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateRows = 'auto auto';  // Two rows
        gridContainer.style.gap = '2px';     // Consistent small gap
        gridContainer.style.padding = '2px';  // Small padding around the grid
        gridContainer.style.backgroundColor = '#ffffff';
        gridContainer.style.marginBottom = '8px';  // Reduced margin before KPI section
    }

    // Update each row to ensure consistent layout
    document.querySelectorAll('.grid-row').forEach(row => {
        row.style.display = 'grid';
        row.style.gridTemplateColumns = 'repeat(7, 1fr)'; // 7 equal columns
        row.style.gap = '2px';  // Same gap as the main grid
        row.style.margin = '0';
        row.style.padding = '0';
    });
    
    // Project filter
    document.getElementById('projectFilter').addEventListener('change', function() {
        currentProjectId = this.value;
        if (currentMetric) {
            loadMetricData(currentMetric);
        }
    });
    
    // Refresh button
    document.getElementById('refreshProjectBtn').addEventListener('click', function() {
        if (currentMetric) {
            loadMetricData(currentMetric);
        } else {
            loadProjects();
        }
    });
    
    // Export buttons in header
    document.getElementById('exportPdf').addEventListener('click', function() {
        if (!currentMetric) {
            alert('Please select a metric first');
            return;
        }
        exportFullPageToPDF();
    });
    
    document.getElementById('exportExcel').addEventListener('click', function() {
        if (!currentMetric) {
            alert('Please select a metric first');
            return;
        }
        exportFullPageToExcel();
    });
    
    document.getElementById('exportImage').addEventListener('click', function() {
        if (!currentMetric) {
            alert('Please select a metric first');
            return;
        }
        exportFullPageToImage();
    });
}

async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE}/api/schedule/projects`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const projects = await response.json();
        const select = document.getElementById('projectFilter');
        
        // Clear existing options except "All Projects"
        select.innerHTML = '<option value="">All Projects</option>';
        
        // Add project options
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
        
        console.log('Loaded projects:', projects.length);
    } catch (error) {
        console.error('Error loading projects:', error);
        showError('Failed to load projects');
    }
}

function selectMetric(metric) {
    console.log('Selecting metric:', metric);
    
    // Reset all cards
    document.querySelectorAll('.metric-card').forEach(card => {
        console.log('Resetting card:', card.dataset.metric);
        card.style.border = '1px solid transparent';
    });
    
    const selectedCard = document.querySelector(`[data-metric="${metric}"]`);
    if (selectedCard) {
        console.log('Found selected card for metric:', metric);
        const colorMap = {
            'leads': '#3B82F6',      // blue-500
            'lags': '#10B981',       // green-500
            'excessive-lags': '#F97316', // orange-500
            'fs': '#8B5CF6',         // purple-500
            'non-fs': '#EF4444',     // red-500
            'open-ends': '#14B8A6',  // teal-500
            'constraints': '#6366F1', // indigo-500
            'excessive-durations': '#9333EA',  // purple-600
            'negative-float': '#2563EB',  // blue-600
            'critical-float': '#FBBF24',  // amber-400
            'excessive-float': '#DC2626',  // red-600
            'invalid-dates': '#EF4444',  // red-500
            'riding-data-date': '#3B82F6',  // blue-500
            'resources': '#000000'  // black
        };
        
        selectedCard.style.border = `2px solid ${colorMap[metric]}`;
    } else {
        console.warn('Selected card not found for metric:', metric);
    }
    
    // Show content area and hide initial message
    document.getElementById('metric-content').classList.remove('hidden');
    document.getElementById('initial-message').classList.add('hidden');
    
    // Make sure pagination controls are visible for debugging
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        paginationControls.style.display = 'flex';
    }
    
    // Handle metric-specific filters
    setupMetricFilters(metric);
    
    currentMetric = metric;
    loadMetricData(metric);
}

// Function to setup metric-specific filters
function setupMetricFilters(metric) {
    // Hide all filter containers
    document.querySelectorAll('[id$="-filters"]').forEach(container => {
        container.style.display = 'none';
    });
    
    // Hide the main filter container
    document.getElementById('metricFilters').style.display = 'none';
    
    // Show filters based on metric
    if (metric === 'open-ends') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('open-ends-filters').style.display = 'flex';
        loadOpenEndsFilters();
    } else if (metric === 'constraints') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('constraints-filters').style.display = 'flex';
        loadConstraintsFilters();
    } else if (metric === 'excessive-durations') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('excessive-durations-filters').style.display = 'flex';
        loadExcessiveDurationsFilters();
    } else if (metric === 'negative-float') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('negative-float-filters').style.display = 'flex';
        loadNegativeFloatFilters();
    } else if (metric === 'critical-float') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('critical-float-filters').style.display = 'flex';
        loadCriticalFloatFilters();
    } else if (metric === 'excessive-float') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('excessive-float-filters').style.display = 'flex';
        loadExcessiveFloatFilters();
    } else if (metric === 'riding-data-date') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('riding-dates-filters').style.display = 'flex';
        loadRidingDatesFilters();
    } else if (metric === 'invalid-dates') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('invalid-dates-filters').style.display = 'flex';
        loadInvalidDatesFilters();
    } else if (metric === 'resources') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('resources-filters').style.display = 'flex';
        loadResourcesFilters();
    } else if (metric === 'fs') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('fs-filters').style.display = 'flex';
        loadFSFilters();
    } else if (metric === 'non-fs') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('non-fs-filters').style.display = 'flex';
        loadNonFSFilters();
    } else if (metric === 'leads') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('leads-filters').style.display = 'flex';
        loadLeadsFilters();
    } else if (metric === 'lags') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('lags-filters').style.display = 'flex';
        loadLagsFilters();
    } else if (metric === 'excessive-lags') {
        document.getElementById('metricFilters').style.display = 'flex';
        document.getElementById('excessive-lags-filters').style.display = 'flex';
        loadExcessiveLagsFilters();
    }
    // Add other metrics here as we implement them
}

// Function to load Open Ends filters
async function loadOpenEndsFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/open-ends-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('activityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/open-ends-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('activityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('open-ends');
        activityStatusSelect.onchange = () => loadMetricData('open-ends');
        
    } catch (error) {
        console.error('Error loading Open Ends filters:', error);
    }
}

// Function to load Constraints filters
async function loadConstraintsFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/constraints-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('constraintsActivityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/constraints-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('constraintsActivityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('constraints');
        activityStatusSelect.onchange = () => loadMetricData('constraints');
        
    } catch (error) {
        console.error('Error loading Constraints filters:', error);
    }
}

// Function to load Excessive Durations filters
async function loadExcessiveDurationsFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/excessive-durations-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('excessiveDurationsActivityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/excessive-durations-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('excessiveDurationsActivityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('excessive-durations');
        activityStatusSelect.onchange = () => loadMetricData('excessive-durations');
        
    } catch (error) {
        console.error('Error loading Excessive Durations filters:', error);
    }
}

// Function to load Negative Total Float filters
async function loadNegativeFloatFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/negative-float-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('negativeFloatActivityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/negative-float-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('negativeFloatActivityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('negative-float');
        activityStatusSelect.onchange = () => loadMetricData('negative-float');
        
    } catch (error) {
        console.error('Error loading Negative Total Float filters:', error);
    }
}

// Function to load Critical Total Float filters
async function loadCriticalFloatFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/critical-float-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('criticalFloatActivityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/critical-float-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('criticalFloatActivityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('critical-float');
        activityStatusSelect.onchange = () => loadMetricData('critical-float');
        
    } catch (error) {
        console.error('Error loading Critical Total Float filters:', error);
    }
}

// Function to load Excessive Total Float filters
async function loadExcessiveFloatFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/excessive-float-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('excessiveFloatActivityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/excessive-float-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('excessiveFloatActivityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('excessive-float');
        activityStatusSelect.onchange = () => loadMetricData('excessive-float');
        
    } catch (error) {
        console.error('Error loading Excessive Total Float filters:', error);
    }
}

// Function to load Riding Data Dates filters
async function loadRidingDatesFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/riding-dates-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('ridingDatesActivityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/riding-dates-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('ridingDatesActivityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('riding-data-date');
        activityStatusSelect.onchange = () => loadMetricData('riding-data-date');
        
    } catch (error) {
        console.error('Error loading Riding Data Dates filters:', error);
    }
}

// Function to load Invalid Dates filters
async function loadInvalidDatesFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/invalid-dates-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('invalidDatesActivityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/invalid-dates-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('invalidDatesActivityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('invalid-dates');
        activityStatusSelect.onchange = () => loadMetricData('invalid-dates');
        
    } catch (error) {
        console.error('Error loading Invalid Dates filters:', error);
    }
}

// Function to load Resources filters
async function loadResourcesFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load activity type filters
        const activityTypeResponse = await fetch(`${API_BASE}/api/schedule/resources-activity-type-filters?project_id=${projectId}`);
        const activityTypes = await activityTypeResponse.json();
        
        const activityTypeSelect = document.getElementById('resourcesActivityTypeFilter');
        activityTypeSelect.innerHTML = '<option value="">All Types</option>';
        activityTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            activityTypeSelect.appendChild(option);
        });
        
        // Load activity status filters
        const activityStatusResponse = await fetch(`${API_BASE}/api/schedule/resources-activity-status-filters?project_id=${projectId}`);
        const activityStatuses = await activityStatusResponse.json();
        
        const activityStatusSelect = document.getElementById('resourcesActivityStatusFilter');
        activityStatusSelect.innerHTML = '<option value="">All Statuses</option>';
        activityStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            activityStatusSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        activityTypeSelect.onchange = () => loadMetricData('resources');
        activityStatusSelect.onchange = () => loadMetricData('resources');
        
    } catch (error) {
        console.error('Error loading Resources filters:', error);
    }
}

// Function to load FS+0d Lag filters
async function loadFSFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load relationship type filters
        const relationshipTypeResponse = await fetch(`${API_BASE}/api/schedule/fs-relationship-type-filters?project_id=${projectId}`);
        const relationshipTypes = await relationshipTypeResponse.json();
        
        const relationshipTypeSelect = document.getElementById('fsRelationshipTypeFilter');
        relationshipTypeSelect.innerHTML = '<option value="">All Types</option>';
        relationshipTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            relationshipTypeSelect.appendChild(option);
        });
        
        // Load lag filters
        const lagResponse = await fetch(`${API_BASE}/api/schedule/fs-lag-filters?project_id=${projectId}`);
        const lags = await lagResponse.json();
        
        const lagSelect = document.getElementById('fsLagFilter');
        lagSelect.innerHTML = '<option value="">All Lags</option>';
        lags.forEach(lag => {
            const option = document.createElement('option');
            option.value = lag;
            option.textContent = lag;
            lagSelect.appendChild(option);
        });
        
        // Load free float filters
        const freeFloatResponse = await fetch(`${API_BASE}/api/schedule/fs-free-float-filters?project_id=${projectId}`);
        const freeFloats = await freeFloatResponse.json();
        
        const freeFloatSelect = document.getElementById('fsFreeFloatFilter');
        freeFloatSelect.innerHTML = '<option value="">All Free Floats</option>';
        freeFloats.forEach(freeFloat => {
            const option = document.createElement('option');
            option.value = freeFloat;
            option.textContent = freeFloat;
            freeFloatSelect.appendChild(option);
        });
        
        // Load driving filters
        const drivingResponse = await fetch(`${API_BASE}/api/schedule/fs-driving-filters?project_id=${projectId}`);
        const drivings = await drivingResponse.json();
        
        const drivingSelect = document.getElementById('fsDrivingFilter');
        drivingSelect.innerHTML = '<option value="">All Driving</option>';
        drivings.forEach(driving => {
            const option = document.createElement('option');
            option.value = driving;
            option.textContent = driving;
            drivingSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        relationshipTypeSelect.onchange = () => loadMetricData('fs');
        lagSelect.onchange = () => loadMetricData('fs');
        freeFloatSelect.onchange = () => loadMetricData('fs');
        drivingSelect.onchange = () => loadMetricData('fs');
        
    } catch (error) {
        console.error('Error loading FS filters:', error);
    }
}

// Function to load Non-FS+0d Lag filters
async function loadNonFSFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load relationship type filters
        const relationshipTypeResponse = await fetch(`${API_BASE}/api/schedule/non-fs-relationship-type-filters?project_id=${projectId}`);
        const relationshipTypes = await relationshipTypeResponse.json();
        
        const relationshipTypeSelect = document.getElementById('nonFsRelationshipTypeFilter');
        relationshipTypeSelect.innerHTML = '<option value="">All Types</option>';
        relationshipTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            relationshipTypeSelect.appendChild(option);
        });
        
        // Load lag filters
        const lagResponse = await fetch(`${API_BASE}/api/schedule/non-fs-lag-filters?project_id=${projectId}`);
        const lags = await lagResponse.json();
        
        const lagSelect = document.getElementById('nonFsLagFilter');
        lagSelect.innerHTML = '<option value="">All Lags</option>';
        lags.forEach(lag => {
            const option = document.createElement('option');
            option.value = lag;
            option.textContent = lag;
            lagSelect.appendChild(option);
        });
        
        // Load free float filters
        const freeFloatResponse = await fetch(`${API_BASE}/api/schedule/non-fs-free-float-filters?project_id=${projectId}`);
        const freeFloats = await freeFloatResponse.json();
        
        const freeFloatSelect = document.getElementById('nonFsFreeFloatFilter');
        freeFloatSelect.innerHTML = '<option value="">All Free Floats</option>';
        freeFloats.forEach(freeFloat => {
            const option = document.createElement('option');
            option.value = freeFloat;
            option.textContent = freeFloat;
            freeFloatSelect.appendChild(option);
        });
        
        // Load driving filters
        const drivingResponse = await fetch(`${API_BASE}/api/schedule/non-fs-driving-filters?project_id=${projectId}`);
        const drivings = await drivingResponse.json();
        
        const drivingSelect = document.getElementById('nonFsDrivingFilter');
        drivingSelect.innerHTML = '<option value="">All Driving</option>';
        drivings.forEach(driving => {
            const option = document.createElement('option');
            option.value = driving;
            option.textContent = driving;
            drivingSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        relationshipTypeSelect.onchange = () => loadMetricData('non-fs');
        lagSelect.onchange = () => loadMetricData('non-fs');
        freeFloatSelect.onchange = () => loadMetricData('non-fs');
        drivingSelect.onchange = () => loadMetricData('non-fs');
        
    } catch (error) {
        console.error('Error loading Non-FS filters:', error);
    }
}

// Function to load Leads filters
async function loadLeadsFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load relationship type filters
        const relationshipTypeResponse = await fetch(`${API_BASE}/api/schedule/leads-relationship-type-filters?project_id=${projectId}`);
        const relationshipTypes = await relationshipTypeResponse.json();
        
        const relationshipTypeSelect = document.getElementById('leadsRelationshipTypeFilter');
        relationshipTypeSelect.innerHTML = '<option value="">All Types</option>';
        relationshipTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            relationshipTypeSelect.appendChild(option);
        });
        
        // Load lag filters
        const lagResponse = await fetch(`${API_BASE}/api/schedule/leads-lag-filters?project_id=${projectId}`);
        const lags = await lagResponse.json();
        
        const lagSelect = document.getElementById('leadsLagFilter');
        lagSelect.innerHTML = '<option value="">All Lags</option>';
        lags.forEach(lag => {
            const option = document.createElement('option');
            option.value = lag;
            option.textContent = lag;
            lagSelect.appendChild(option);
        });
        
        // Load free float filters
        const freeFloatResponse = await fetch(`${API_BASE}/api/schedule/leads-free-float-filters?project_id=${projectId}`);
        const freeFloats = await freeFloatResponse.json();
        
        const freeFloatSelect = document.getElementById('leadsFreeFloatFilter');
        freeFloatSelect.innerHTML = '<option value="">All Free Floats</option>';
        freeFloats.forEach(freeFloat => {
            const option = document.createElement('option');
            option.value = freeFloat;
            option.textContent = freeFloat;
            freeFloatSelect.appendChild(option);
        });
        
        // Load driving filters
        const drivingResponse = await fetch(`${API_BASE}/api/schedule/leads-driving-filters?project_id=${projectId}`);
        const drivings = await drivingResponse.json();
        
        const drivingSelect = document.getElementById('leadsDrivingFilter');
        drivingSelect.innerHTML = '<option value="">All Driving</option>';
        drivings.forEach(driving => {
            const option = document.createElement('option');
            option.value = driving;
            option.textContent = driving;
            drivingSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        relationshipTypeSelect.onchange = () => loadMetricData('leads');
        lagSelect.onchange = () => loadMetricData('leads');
        freeFloatSelect.onchange = () => loadMetricData('leads');
        drivingSelect.onchange = () => loadMetricData('leads');
        
    } catch (error) {
        console.error('Error loading Leads filters:', error);
    }
}

// Function to load Lags filters
async function loadLagsFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load relationship type filters
        const relationshipTypeResponse = await fetch(`${API_BASE}/api/schedule/lags-relationship-type-filters?project_id=${projectId}`);
        const relationshipTypes = await relationshipTypeResponse.json();
        
        const relationshipTypeSelect = document.getElementById('lagsRelationshipTypeFilter');
        relationshipTypeSelect.innerHTML = '<option value="">All Types</option>';
        relationshipTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            relationshipTypeSelect.appendChild(option);
        });
        
        // Load lag filters
        const lagResponse = await fetch(`${API_BASE}/api/schedule/lags-lag-filters?project_id=${projectId}`);
        const lags = await lagResponse.json();
        
        const lagSelect = document.getElementById('lagsLagFilter');
        lagSelect.innerHTML = '<option value="">All Lags</option>';
        lags.forEach(lag => {
            const option = document.createElement('option');
            option.value = lag;
            option.textContent = lag;
            lagSelect.appendChild(option);
        });
        
        // Load free float filters
        const freeFloatResponse = await fetch(`${API_BASE}/api/schedule/lags-free-float-filters?project_id=${projectId}`);
        const freeFloats = await freeFloatResponse.json();
        
        const freeFloatSelect = document.getElementById('lagsFreeFloatFilter');
        freeFloatSelect.innerHTML = '<option value="">All Free Floats</option>';
        freeFloats.forEach(freeFloat => {
            const option = document.createElement('option');
            option.value = freeFloat;
            option.textContent = freeFloat;
            freeFloatSelect.appendChild(option);
        });
        
        // Load driving filters
        const drivingResponse = await fetch(`${API_BASE}/api/schedule/lags-driving-filters?project_id=${projectId}`);
        const drivings = await drivingResponse.json();
        
        const drivingSelect = document.getElementById('lagsDrivingFilter');
        drivingSelect.innerHTML = '<option value="">All Driving</option>';
        drivings.forEach(driving => {
            const option = document.createElement('option');
            option.value = driving;
            option.textContent = driving;
            drivingSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        relationshipTypeSelect.onchange = () => loadMetricData('lags');
        lagSelect.onchange = () => loadMetricData('lags');
        freeFloatSelect.onchange = () => loadMetricData('lags');
        drivingSelect.onchange = () => loadMetricData('lags');
        
    } catch (error) {
        console.error('Error loading Lags filters:', error);
    }
}

// Function to load Excessive Lags filters
async function loadExcessiveLagsFilters() {
    try {
        const projectId = currentProjectId || '';
        
        // Load relationship type filters
        const relationshipTypeResponse = await fetch(`${API_BASE}/api/schedule/excessive-lags-relationship-type-filters?project_id=${projectId}`);
        const relationshipTypes = await relationshipTypeResponse.json();
        
        const relationshipTypeSelect = document.getElementById('excessiveLagsRelationshipTypeFilter');
        relationshipTypeSelect.innerHTML = '<option value="">All Types</option>';
        relationshipTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            relationshipTypeSelect.appendChild(option);
        });
        
        // Load lag filters
        const lagResponse = await fetch(`${API_BASE}/api/schedule/excessive-lags-lag-filters?project_id=${projectId}`);
        const lags = await lagResponse.json();
        
        const lagSelect = document.getElementById('excessiveLagsLagFilter');
        lagSelect.innerHTML = '<option value="">All Lags</option>';
        lags.forEach(lag => {
            const option = document.createElement('option');
            option.value = lag;
            option.textContent = lag;
            lagSelect.appendChild(option);
        });
        
        // Load free float filters
        const freeFloatResponse = await fetch(`${API_BASE}/api/schedule/excessive-lags-free-float-filters?project_id=${projectId}`);
        const freeFloats = await freeFloatResponse.json();
        
        const freeFloatSelect = document.getElementById('excessiveLagsFreeFloatFilter');
        freeFloatSelect.innerHTML = '<option value="">All Free Floats</option>';
        freeFloats.forEach(freeFloat => {
            const option = document.createElement('option');
            option.value = freeFloat;
            option.textContent = freeFloat;
            freeFloatSelect.appendChild(option);
        });
        
        // Load driving filters
        const drivingResponse = await fetch(`${API_BASE}/api/schedule/excessive-lags-driving-filters?project_id=${projectId}`);
        const drivings = await drivingResponse.json();
        
        const drivingSelect = document.getElementById('excessiveLagsDrivingFilter');
        drivingSelect.innerHTML = '<option value="">All Driving</option>';
        drivings.forEach(driving => {
            const option = document.createElement('option');
            option.value = driving;
            option.textContent = driving;
            drivingSelect.appendChild(option);
        });
        
        // Add event listeners for filter changes
        relationshipTypeSelect.onchange = () => loadMetricData('excessive-lags');
        lagSelect.onchange = () => loadMetricData('excessive-lags');
        freeFloatSelect.onchange = () => loadMetricData('excessive-lags');
        drivingSelect.onchange = () => loadMetricData('excessive-lags');
        
    } catch (error) {
        console.error('Error loading Excessive Lags filters:', error);
    }
}

async function loadMetricData(metric) {
    try {
        showLoading();
        
        // Reset pagination for new metric
        currentPage = 1;
        totalPages = 1;
        totalRecords = 0;
        allTableData = [];
        
        // Load all metric data in parallel
        const [kpiData, chartData, historyData, tableData] = await Promise.all([
            fetchKPIData(metric),
            fetchChartData(metric),
            fetchHistoryData(metric),
            fetchTableData(metric)
        ]);
        
        // Update UI with data
        updateKPISection(kpiData, metric);
        updateChartSection(chartData, metric);
        updateHistorySection(historyData, metric);
        // Table data is now handled by fetchTableData with pagination
        
        hideLoading();
    } catch (error) {
        console.error('Error loading metric data:', error);
        showError(`Failed to load ${metric} data`);
        hideLoading();
    }
}

async function fetchKPIData(metric) {
    const endpoint = getKPIEndpoint(metric);
    const params = new URLSearchParams();
    
    if (currentProjectId) {
        params.append('project_id', currentProjectId);
    }
    
    // Add metric-specific filters
    if (metric === 'open-ends') {
        const activityType = document.getElementById('activityTypeFilter')?.value;
        const activityStatus = document.getElementById('activityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'constraints') {
        const activityType = document.getElementById('constraintsActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('constraintsActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'excessive-durations') {
        const activityType = document.getElementById('excessiveDurationsActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('excessiveDurationsActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'negative-float') {
        const activityType = document.getElementById('negativeFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('negativeFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'critical-float') {
        const activityType = document.getElementById('criticalFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('criticalFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'excessive-float') {
        const activityType = document.getElementById('excessiveFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('excessiveFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'riding-data-date') {
        const activityType = document.getElementById('ridingDatesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('ridingDatesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'invalid-dates') {
        const activityType = document.getElementById('invalidDatesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('invalidDatesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'resources') {
        const activityType = document.getElementById('resourcesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('resourcesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'fs') {
        const relationshipType = document.getElementById('fsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('fsLagFilter')?.value;
        const freeFloat = document.getElementById('fsFreeFloatFilter')?.value;
        const driving = document.getElementById('fsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'non-fs') {
        const relationshipType = document.getElementById('nonFsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('nonFsLagFilter')?.value;
        const freeFloat = document.getElementById('nonFsFreeFloatFilter')?.value;
        const driving = document.getElementById('nonFsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'leads') {
        const relationshipType = document.getElementById('leadsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('leadsLagFilter')?.value;
        const freeFloat = document.getElementById('leadsFreeFloatFilter')?.value;
        const driving = document.getElementById('leadsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'lags') {
        const relationshipType = document.getElementById('lagsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('lagsLagFilter')?.value;
        const freeFloat = document.getElementById('lagsFreeFloatFilter')?.value;
        const driving = document.getElementById('lagsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'excessive-lags') {
        const relationshipType = document.getElementById('excessiveLagsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('excessiveLagsLagFilter')?.value;
        const freeFloat = document.getElementById('excessiveLagsFreeFloatFilter')?.value;
        const driving = document.getElementById('excessiveLagsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    }
    
    const url = `${API_BASE}${endpoint}?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch KPI data: ${response.status}`);
    return response.json();
}

async function fetchChartData(metric) {
    const endpoint = getChartEndpoint(metric);
    const params = new URLSearchParams();
    
    if (currentProjectId) {
        params.append('project_id', currentProjectId);
    }
    
    // Add metric-specific filters
    if (metric === 'open-ends') {
        const activityType = document.getElementById('activityTypeFilter')?.value;
        const activityStatus = document.getElementById('activityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'constraints') {
        const activityType = document.getElementById('constraintsActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('constraintsActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'excessive-durations') {
        const activityType = document.getElementById('excessiveDurationsActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('excessiveDurationsActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'negative-float') {
        const activityType = document.getElementById('negativeFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('negativeFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'critical-float') {
        const activityType = document.getElementById('criticalFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('criticalFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'excessive-float') {
        const activityType = document.getElementById('excessiveFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('excessiveFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'riding-data-date') {
        const activityType = document.getElementById('ridingDatesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('ridingDatesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'invalid-dates') {
        const activityType = document.getElementById('invalidDatesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('invalidDatesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'resources') {
        const activityType = document.getElementById('resourcesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('resourcesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'fs') {
        const relationshipType = document.getElementById('fsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('fsLagFilter')?.value;
        const freeFloat = document.getElementById('fsFreeFloatFilter')?.value;
        const driving = document.getElementById('fsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'non-fs') {
        const relationshipType = document.getElementById('nonFsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('nonFsLagFilter')?.value;
        const freeFloat = document.getElementById('nonFsFreeFloatFilter')?.value;
        const driving = document.getElementById('nonFsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'leads') {
        const relationshipType = document.getElementById('leadsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('leadsLagFilter')?.value;
        const freeFloat = document.getElementById('leadsFreeFloatFilter')?.value;
        const driving = document.getElementById('leadsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'lags') {
        const relationshipType = document.getElementById('lagsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('lagsLagFilter')?.value;
        const freeFloat = document.getElementById('lagsFreeFloatFilter')?.value;
        const driving = document.getElementById('lagsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'excessive-lags') {
        const relationshipType = document.getElementById('excessiveLagsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('excessiveLagsLagFilter')?.value;
        const freeFloat = document.getElementById('excessiveLagsFreeFloatFilter')?.value;
        const driving = document.getElementById('excessiveLagsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    }
    
    const url = `${API_BASE}${endpoint}?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch chart data: ${response.status}`);
    return response.json();
}

async function fetchHistoryData(metric) {
    const endpoint = getHistoryEndpoint(metric);
    const params = new URLSearchParams();
    
    if (currentProjectId) {
        params.append('project_id', currentProjectId);
    }
    
    // Add metric-specific filters
    if (metric === 'open-ends') {
        const activityType = document.getElementById('activityTypeFilter')?.value;
        const activityStatus = document.getElementById('activityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'constraints') {
        const activityType = document.getElementById('constraintsActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('constraintsActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'excessive-durations') {
        const activityType = document.getElementById('excessiveDurationsActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('excessiveDurationsActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'negative-float') {
        const activityType = document.getElementById('negativeFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('negativeFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'critical-float') {
        const activityType = document.getElementById('criticalFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('criticalFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'excessive-float') {
        const activityType = document.getElementById('excessiveFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('excessiveFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'riding-data-date') {
        const activityType = document.getElementById('ridingDatesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('ridingDatesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'invalid-dates') {
        const activityType = document.getElementById('invalidDatesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('invalidDatesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'resources') {
        const activityType = document.getElementById('resourcesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('resourcesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'fs') {
        const relationshipType = document.getElementById('fsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('fsLagFilter')?.value;
        const freeFloat = document.getElementById('fsFreeFloatFilter')?.value;
        const driving = document.getElementById('fsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'non-fs') {
        const relationshipType = document.getElementById('nonFsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('nonFsLagFilter')?.value;
        const freeFloat = document.getElementById('nonFsFreeFloatFilter')?.value;
        const driving = document.getElementById('nonFsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'leads') {
        const relationshipType = document.getElementById('leadsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('leadsLagFilter')?.value;
        const freeFloat = document.getElementById('leadsFreeFloatFilter')?.value;
        const driving = document.getElementById('leadsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'lags') {
        const relationshipType = document.getElementById('lagsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('lagsLagFilter')?.value;
        const freeFloat = document.getElementById('lagsFreeFloatFilter')?.value;
        const driving = document.getElementById('lagsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'excessive-lags') {
        const relationshipType = document.getElementById('excessiveLagsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('excessiveLagsLagFilter')?.value;
        const freeFloat = document.getElementById('excessiveLagsFreeFloatFilter')?.value;
        const driving = document.getElementById('excessiveLagsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    }
    
    const url = `${API_BASE}${endpoint}?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch history data: ${response.status}`);
    return response.json();
}

async function fetchTableData(metric) {
    const endpoint = getTableEndpoint(metric);
    const params = new URLSearchParams();
    
    if (currentProjectId) {
        params.append('project_id', currentProjectId);
    }
    
    // Remove limit to get all data for pagination
    // params.append('limit', '20');
    
    // Add metric-specific filters
    if (metric === 'open-ends') {
        const activityType = document.getElementById('activityTypeFilter')?.value;
        const activityStatus = document.getElementById('activityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'constraints') {
        const activityType = document.getElementById('constraintsActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('constraintsActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'excessive-durations') {
        const activityType = document.getElementById('excessiveDurationsActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('excessiveDurationsActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'negative-float') {
        const activityType = document.getElementById('negativeFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('negativeFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'critical-float') {
        const activityType = document.getElementById('criticalFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('criticalFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'excessive-float') {
        const activityType = document.getElementById('excessiveFloatActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('excessiveFloatActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'riding-data-date') {
        const activityType = document.getElementById('ridingDatesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('ridingDatesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'invalid-dates') {
        const activityType = document.getElementById('invalidDatesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('invalidDatesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'resources') {
        const activityType = document.getElementById('resourcesActivityTypeFilter')?.value;
        const activityStatus = document.getElementById('resourcesActivityStatusFilter')?.value;
        
        if (activityType) params.append('activity_type', activityType);
        if (activityStatus) params.append('activity_status', activityStatus);
    } else if (metric === 'fs') {
        const relationshipType = document.getElementById('fsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('fsLagFilter')?.value;
        const freeFloat = document.getElementById('fsFreeFloatFilter')?.value;
        const driving = document.getElementById('fsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'non-fs') {
        const relationshipType = document.getElementById('nonFsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('nonFsLagFilter')?.value;
        const freeFloat = document.getElementById('nonFsFreeFloatFilter')?.value;
        const driving = document.getElementById('nonFsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'leads') {
        const relationshipType = document.getElementById('leadsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('leadsLagFilter')?.value;
        const freeFloat = document.getElementById('leadsFreeFloatFilter')?.value;
        const driving = document.getElementById('leadsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'lags') {
        const relationshipType = document.getElementById('lagsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('lagsLagFilter')?.value;
        const freeFloat = document.getElementById('lagsFreeFloatFilter')?.value;
        const driving = document.getElementById('lagsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    } else if (metric === 'excessive-lags') {
        const relationshipType = document.getElementById('excessiveLagsRelationshipTypeFilter')?.value;
        const lag = document.getElementById('excessiveLagsLagFilter')?.value;
        const freeFloat = document.getElementById('excessiveLagsFreeFloatFilter')?.value;
        const driving = document.getElementById('excessiveLagsDrivingFilter')?.value;
        
        if (relationshipType) params.append('relationship_type', relationshipType);
        if (lag) params.append('lag', lag);
        if (freeFloat) params.append('free_float', freeFloat);
        if (driving) params.append('driving', driving);
    }
    
    const url = `${API_BASE}${endpoint}?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch table data: ${response.status}`);
    const data = await response.json();
    
    // Store all data and reset pagination
    allTableData = data;
    totalRecords = data.length;
    totalPages = Math.ceil(totalRecords / pageSize);
    currentPage = 1;
    
    console.log('Table data loaded:', totalRecords, 'records,', totalPages, 'pages');
    
    // Get current page data
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = data.slice(startIndex, endIndex);
    
    console.log('Current page data:', currentPageData.length, 'records');
    
    updateTableSection(currentPageData, metric);
    updatePaginationControls();
    
    return data;
}

function getKPIEndpoint(metric) {
    const endpoints = {
        'leads': '/api/schedule/leads-kpi',
        'lags': '/api/schedule/lags-kpi',
        'excessive-lags': '/api/schedule/excessive-lags-kpi',
        'fs': '/api/schedule/relationship-metrics',  // FS+0d endpoint
        'non-fs': '/api/schedule/non-fs-relationship-metrics',  // Non-FS endpoint
        'open-ends': '/api/schedule/open-ends-kpi',
        'constraints': '/api/schedule/constraints-kpi',
        'excessive-durations': '/api/schedule/excessive-durations-kpi',
        'negative-float': '/api/schedule/negative-float-kpi',
        'critical-float': '/api/schedule/critical-float-kpi',
        'excessive-float': '/api/schedule/excessive-float-kpi',
        'invalid-dates': '/api/schedule/invalid-dates-kpi',
        'riding-data-date': '/api/schedule/riding-data-date-kpi',
        'resources': '/api/schedule/resources-kpi'
    };
    return endpoints[metric];
}

function getChartEndpoint(metric) {
    const endpoints = {
        'leads': '/api/schedule/leads-chart-data',
        'lags': '/api/schedule/lags-chart-data',
        'excessive-lags': '/api/schedule/excessive-lags-chart-data',
        'fs': '/api/schedule/fs-chart-data',
        'non-fs': '/api/schedule/non-fs-chart-data',
        'open-ends': '/api/schedule/open-ends-chart-data',
        'constraints': '/api/schedule/constraints-chart-data',
        'excessive-durations': '/api/schedule/excessive-durations-chart-data',
        'negative-float': '/api/schedule/negative-float-chart-data',
        'critical-float': '/api/schedule/critical-float-chart-data',
        'excessive-float': '/api/schedule/excessive-float-chart-data',
        'invalid-dates': '/api/schedule/invalid-dates-chart-data',
        'riding-data-date': '/api/schedule/riding-data-date-chart-data',
        'resources': '/api/schedule/resources-chart-data'
    };
    return endpoints[metric];
}

function getHistoryEndpoint(metric) {
    const endpoints = {
        'leads': '/api/schedule/leads-percentage-history',
        'lags': '/api/schedule/lags-percentage-history',
        'excessive-lags': '/api/schedule/excessive-lags-percentage-history',
        'fs': '/api/schedule/fs-percentage-history',
        'non-fs': '/api/schedule/non-fs-percentage-history',
        'open-ends': '/api/schedule/open-ends-percentage-history',
        'constraints': '/api/schedule/constraints-percentage-history',
        'excessive-durations': '/api/schedule/excessive-durations-percentage-history',
        'negative-float': '/api/schedule/negative-float-percentage-history',
        'critical-float': '/api/schedule/critical-float-percentage-history',
        'excessive-float': '/api/schedule/excessive-float-percentage-history',
        'invalid-dates': '/api/schedule/invalid-dates-percentage-history',
        'riding-data-date': '/api/schedule/riding-data-date-percentage-history',
        'resources': '/api/schedule/resources-percentage-history'
    };
    return endpoints[metric];
}

function getTableEndpoint(metric) {
    const endpoints = {
        'leads': '/api/schedule/leads',
        'lags': '/api/schedule/lags',
        'excessive-lags': '/api/schedule/excessive-lags',
        'fs': '/api/schedule/fs',
        'non-fs': '/api/schedule/non-fs',
        'open-ends': '/api/schedule/open-ends',
        'constraints': '/api/schedule/constraints',
        'excessive-durations': '/api/schedule/excessive-durations',
        'negative-float': '/api/schedule/negative-float',
        'critical-float': '/api/schedule/critical-float',
        'excessive-float': '/api/schedule/excessive-float',
        'invalid-dates': '/api/schedule/invalid-dates',
        'riding-data-date': '/api/schedule/riding-data-date',
        'resources': '/api/schedule/resources'
    };
    return endpoints[metric];
}

function updateKPISection(data, metric) {
    const kpiSection = document.getElementById('kpi-section');
    kpiSection.innerHTML = '';
    kpiSection.style.marginTop = '6px';  // Moderate margin
    kpiSection.style.paddingTop = '3px';  // Moderate padding
    kpiSection.style.display = 'grid';
    kpiSection.style.gridTemplateColumns = 'repeat(3, 1fr)';
    kpiSection.style.gap = '3px';  // Moderate gap between cards
    kpiSection.style.maxWidth = '100%';
    kpiSection.style.overflow = 'hidden';
    
    const kpiCards = getKPICards(data, metric);
    kpiCards.forEach(card => {
        const cardElement = createKPICard(card);
        kpiSection.appendChild(cardElement);
    });
}

function getKPICards(data, metric) {
    switch (metric) {
        case 'leads':
            return [
                { title: 'Leads Count', value: data.Leads_Count || 0, color: 'blue' },
                { title: 'Remaining Relationships', value: data.Remaining_Relationship_Count || 0, color: 'red' },
                { title: 'Lead (%)', value: (data.Lead_Percentage || 0).toFixed(2) + '%', color: 'green' }
            ];
        case 'lags':
            return [
                { title: 'Lag Count', value: data.Lag_Count || 0, color: 'blue' },
                { title: 'Remaining Relationships', value: data.Remaining_Relationship_Count || 0, color: 'red' },
                { title: 'Lag (%)', value: (data.Lag_Percentage || 0).toFixed(2) + '%', color: 'green' }
            ];
        case 'excessive-lags':
            return [
                { title: 'Lag Count', value: data.Lag_Count || 0, color: 'blue' },
                { title: 'Remaining Relationships', value: data.Remaining_Relationship_Count || 0, color: 'red' },
                { title: 'Lag (%)', value: (data.Lag_Percentage || 0).toFixed(2) + '%', color: 'orange' }
            ];
        case 'fs':
            return [
                { 
                    title: 'Total Relationships', 
                    value: data.Total_FS_Count || 0, 
                    color: 'blue'
                },
                { 
                    title: 'Remaining Relationships', 
                    value: data.Remaining_Count || 0, 
                    color: 'red'
                },
                { 
                    title: 'Lag Count', 
                    value: data.Lag_Count || 0, 
                    color: 'green'
                }
            ];
        case 'non-fs':
            return [
                { title: 'Total Relationships', value: data.Total_Relationship_Count || 0, color: 'blue' },
                { title: 'Remaining Relationships', value: data.Remaining_Count || 0, color: 'red' },
                { title: 'Lag Count', value: data.Lag_Count || 0, color: 'green' }
            ];
        case 'open-ends':
            return [
                { title: 'Open End Count', value: data.Open_End_Count || 0, color: 'teal' },
                { title: 'Permissible Open Ends', value: data.Permissible_Open_Ends || 2, color: 'green' },
                { title: 'Open Ends %', value: (data.Open_End_Percentage || 0).toFixed(2) + '%', color: 'blue' }
            ];
        case 'constraints':
            return [
                { title: 'Constraint Count', value: data.Constraint_Count || 0, color: 'indigo' },
                { title: 'Remaining Activities', value: data.Remaining_Activities || 0, color: 'blue' },
                { title: 'Constraints %', value: (parseFloat(data.Constraint_Percentage || 0)).toFixed(2) + '%', color: 'purple' }
            ];
        case 'excessive-durations':
            return [
                { title: 'Excessive Duration Count', value: data.ED_Count || 0, color: 'purple' },
                { title: 'Remaining Activities', value: data.Remaining_Activities || 0, color: 'blue' },
                { title: 'Excessive Duration %', value: (parseFloat(data.Excessive_Duration_Percentage || 0)).toFixed(1) + '%', color: 'orange' }
            ];
        case 'negative-float':
            return [
                { title: 'Negative Total Float Count', value: data.NTF_Count || 0, color: 'blue' },
                { title: 'Remaining Activities', value: data.Remaining_Activities || 0, color: 'red' },
                { title: 'Negative Total Float %', value: (parseFloat(data.Negative_Float_Percentage || 0)).toFixed(1) + '%', color: 'orange' }
            ];
        case 'critical-float':
            return [
                { title: 'Critical Total Float Count', value: data.CTF_Count || 0, color: 'yellow' },
                { title: 'Remaining Activities', value: data.Remaining_Activities || 0, color: 'red' },
                { title: 'Critical Total Float %', value: (parseFloat(data.Critical_Float_Percentage || 0)).toFixed(1) + '%', color: 'orange' }
            ];
        case 'excessive-float':
            return [
                { title: 'Excessive Total Float Count', value: data.ETF_Count || 0, color: 'red' },
                { title: 'Remaining Activities', value: data.Remaining_Activities || 0, color: 'blue' },
                { title: 'Excessive Total Float %', value: (parseFloat(data.Excessive_Float_Percentage || 0)).toFixed(1) + '%', color: 'orange' }
            ];
        case 'invalid-dates':
            return [
                { title: 'Invalid Dates Count', value: data.IND_Count || 0, color: 'red' },
                { title: 'Remaining Activities', value: data.Remaining_Activities || 0, color: 'blue' },
                { title: 'Invalid Dates %', value: (parseFloat(data.Invalid_Dates_Percentage || 0)).toFixed(1) + '%', color: 'orange' }
            ];
        case 'riding-data-date':
            return [
                { title: 'Riding Data Date Count', value: data.TRDD_Count || 0, color: 'blue' },
                { title: 'Remaining Activities', value: data.Remaining_Activities || 0, color: 'red' },
                { title: 'Riding Data Date %', value: (parseFloat(data.Riding_Data_Date_Percentage || 0)).toFixed(1) + '%', color: 'orange' }
            ];
        case 'resources':
            return [
                { title: 'Resource Load Count', value: data.ResourceLoad_Count || 0, color: 'black' },
                { title: 'Remaining Activities', value: data.Remaining_Activities || 0, color: 'black' },
                { title: 'Resource Load %', value: (parseFloat(data.Resource_Load_Percentage || 0)).toFixed(1) + '%', color: 'black' }
            ];
        default:
            return [];
    }
}

function createKPICard(card) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow';
    div.style.padding = '3px';  // Moderate padding
    div.style.margin = '0';
    div.style.minWidth = '0';
    
    // Always use black text for KPI cards
    const container = document.createElement('div');
    container.className = 'text-center';
    container.style.lineHeight = '1.2';  // Slightly more spacing
    
    const title = document.createElement('h3');
    title.style.fontSize = '9px';  // Increased from 8px
    title.style.marginBottom = '3px';  // Increased spacing
    title.style.color = '#000000';  // Force black text
    title.textContent = card.title;
    
    const value = document.createElement('p');
    value.style.fontSize = '10px';  // Increased from 9px
    value.style.marginTop = '3px';  // Increased spacing
    value.style.fontWeight = '500';  // Medium weight for better readability
    value.style.color = '#000000';  // Force black text
    value.textContent = card.value;
    
    container.appendChild(title);
    container.appendChild(value);
    div.appendChild(container);
    
    return div;
}

function updateChartSection(data, metric) {
    if (currentChart) {
        currentChart.destroy();
    }
    
    const ctx = document.getElementById('metric-chart').getContext('2d');
    currentChart = createChart(ctx, data, metric);
}

function updateHistorySection(data, metric) {
    if (currentHistoryChart) {
        currentHistoryChart.destroy();
    }
    
    const ctx = document.getElementById('history-chart').getContext('2d');
    currentHistoryChart = createHistoryChart(ctx, data, metric);
}

function createChart(ctx, data, metric) {
    // Special handling for resources - scatter plot
    if (metric === 'resources') {
        const config = {
            type: 'scatter',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Count of Resource',
                            font: {
                                size: 9
                            }
                        },
                        ticks: {
                            font: {
                                size: 8
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Float Days',
                            font: {
                                size: 9
                            }
                        },
                        ticks: {
                            font: {
                                size: 8
                            }
                        },
                        max: 15    // Set maximum to 15 as per requirement
                        // Removed min: -15 to allow all negative values
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        align: 'center',
                        title: {
                            display: true,
                            text: 'Resource',
                            font: {
                                size: 9,
                                weight: 'bold'
                            }
                        },
                        labels: {
                            font: {
                                size: 8
                            },
                            padding: 4,
                            usePointStyle: true,
                            boxWidth: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return `${point.resource}: ${point.count} activities, Float: ${point.y} days`;
                            }
                        }
                    }
                }
            }
        };

        // Process data for scatter plot
        if (Array.isArray(data)) {
            // Filter data for non-blank resources and total float days <= 15
            const filteredData = data.filter(item => {
                const floatDays = parseFloat(item.float_days);
                return item.resource && item.resource.trim() !== '' && 
                       !isNaN(floatDays) && floatDays <= 15; // Keep upper limit but allow all negative values
            });

            // Find minimum float days to adjust y-axis
            let minFloatDays = 0;
            filteredData.forEach(item => {
                const floatDays = parseFloat(item.float_days);
                if (floatDays < minFloatDays) {
                    minFloatDays = floatDays;
                }
            });
            
            // Adjust y-axis minimum with some padding
            config.options.scales.y.min = Math.floor(minFloatDays * 1.1);

            // Group filtered data by resource
            const groupedData = {};
            filteredData.forEach(item => {
                if (!groupedData[item.resource]) {
                    groupedData[item.resource] = [];
                }
                groupedData[item.resource].push({
                    x: parseInt(item.activity_count),
                    y: parseFloat(item.float_days),
                    count: parseInt(item.activity_count),
                    resource: item.resource,
                    status: item.status
                });
            });

            // Create datasets for each resource
            const colors = [
                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
            ];

            Object.entries(groupedData).forEach(([resource, points], index) => {
                config.data.datasets.push({
                    label: resource,
                    data: points,
                    backgroundColor: colors[index % colors.length],
                    pointRadius: function(context) {
                        const value = context.raw.count;
                        return Math.sqrt(value) * 2;  // Scale point size based on count
                    },
                    pointHoverRadius: function(context) {
                        const value = context.raw.count;
                        return (Math.sqrt(value) * 2) + 2;
                    }
                });
            });
        }

        return new Chart(ctx, config);
    }

    // Special handling for negative-float - scatter plot
    if (metric === 'negative-float') {
        const config = {
            type: 'scatter',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Activity Count',
                            font: {
                                size: 9
                            }
                        },
                        ticks: {
                            font: {
                                size: 8
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Float Days',
                            font: {
                                size: 9
                            }
                        },
                        ticks: {
                            font: {
                                size: 8
                            }
                        },
                        max: 0,  // Set maximum to 0 since we only want negative values
                        suggestedMin: -200  // Dynamically adjust based on data
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        align: 'center',
                        title: {
                            display: true,
                            text: 'Activity Status',
                            font: {
                                size: 9,
                                weight: 'bold'
                            }
                        },
                        labels: {
                            font: {
                                size: 8
                            },
                            padding: 4,
                            usePointStyle: true,
                            boxWidth: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return `${point.status}: ${point.count} activities, Float: ${point.y} days`;
                            }
                        }
                    }
                }
            }
        };

        // Process data for scatter plot
        if (Array.isArray(data)) {
            const statusColors = {
                'Active': '#3B82F6',  // blue-500
                'NotStart': '#10B981'  // green-500
            };

            // Find minimum float days to set scale
            let minFloatDays = 0;
            data.forEach(item => {
                const floatDays = parseFloat(item.float_days);
                if (floatDays < minFloatDays) {
                    minFloatDays = floatDays;
                }
            });
            
            // Adjust y-axis minimum with some padding
            config.options.scales.y.suggestedMin = Math.floor(minFloatDays * 1.1);

            // Group data by status
            const groupedData = {};
            data.forEach(item => {
                if (!groupedData[item.status]) {
                    groupedData[item.status] = [];
                }
                groupedData[item.status].push({
                    x: parseInt(item.activity_count),
                    y: parseFloat(item.float_days),
                    count: parseInt(item.activity_count),
                    status: item.status
                });
            });

            // Create datasets
            Object.entries(groupedData).forEach(([status, points]) => {
                config.data.datasets.push({
                    label: status,
                    data: points,
                    backgroundColor: statusColors[status] || '#6B7280',
                    pointRadius: function(context) {
                        const value = context.raw.count;
                        return Math.sqrt(value) * 2;  // Scale point size based on count
                    },
                    pointHoverRadius: function(context) {
                        const value = context.raw.count;
                        return (Math.sqrt(value) * 2) + 2;
                    }
                });
            });
        }

        return new Chart(ctx, config);
    }

    // Special handling for invalid-dates and riding-data-date - donut chart
    if (metric === 'invalid-dates' || metric === 'riding-data-date') {
        const config = {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: metric === 'invalid-dates' ? [
                        '#EF4444', // red-500
                        '#F87171', // red-400
                        '#FCA5A5', // red-300
                        '#FEE2E2'  // red-100
                    ] : [
                        '#3B82F6', // blue-500
                        '#60A5FA', // blue-400
                        '#93C5FD', // blue-300
                        '#BFDBFE'  // blue-100
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        align: 'center',
                        title: {
                            display: true,
                            text: 'Activity Type',
                            font: {
                                size: 9,
                                weight: 'bold'
                            }
                        },
                        labels: {
                            font: {
                                size: 8
                            },
                            padding: 4,
                            usePointStyle: true,
                            boxWidth: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} activities`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        };

        // Process data for donut chart
        if (Array.isArray(data) && data.length > 0) {
            config.data.labels = data.map(item => item.activitytype);
            config.data.datasets[0].data = data.map(item => parseInt(item.count));
        }

        return new Chart(ctx, config);
    }

    // Special handling for excessive-durations - donut chart
    if (metric === 'excessive-durations') {
        const config = {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#9333EA', // purple-600 for Active
                        '#C084FC'  // purple-400 for NotStart
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        align: 'center',
                        title: {
                            display: true,
                            text: 'Activity Status',
                            font: {
                                size: 9,
                                weight: 'bold'
                            }
                        },
                        labels: {
                            font: {
                                size: 8
                            },
                            padding: 4,
                            usePointStyle: true,
                            boxWidth: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} activities`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        };

        // Process data for excessive durations donut chart
        if (Array.isArray(data) && data.length > 0) {
            // Filter only Excessive Duration data
            const excessiveDurationData = data.filter(item => item.duration_category === 'Excessive Duration');
            config.data.labels = excessiveDurationData.map(item => item.status);
            config.data.datasets[0].data = excessiveDurationData.map(item => parseInt(item.count));
        }

        return new Chart(ctx, config);
    }

    // Special handling for excessive-float - scatter plot
    if (metric === 'excessive-float') {
        const config = {
            type: 'scatter',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Activity Count',
                            font: {
                                size: 9
                            }
                        },
                        ticks: {
                            font: {
                                size: 8
                            }
                        },
                        min: 0,
                        suggestedMax: null  // Will be set dynamically based on data
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Float Days',
                            font: {
                                size: 9
                            }
                        },
                        ticks: {
                            font: {
                                size: 8
                            }
                        },
                        min: 40,  // Set minimum to 40 since we only want values >= 40
                        suggestedMax: null  // Will be set dynamically based on data
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        align: 'center',
                        title: {
                            display: true,
                            text: 'Activity Status',
                            font: {
                                size: 9,
                                weight: 'bold'
                            }
                        },
                        labels: {
                            font: {
                                size: 8
                            },
                            padding: 4,
                            usePointStyle: true,
                            boxWidth: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return `${point.status}: ${point.count} activities, Float: ${point.y} days`;
                            }
                        }
                    }
                }
            }
        };

        // Process data for scatter plot
        if (Array.isArray(data)) {
            const statusColors = {
                'Active': '#3B82F6',  // blue-500
                'NotStart': '#10B981'  // green-500
            };

            // Find maximum values for axes
            let maxCount = 0;
            let maxFloatDays = 40;
            data.forEach(item => {
                const count = parseInt(item.activity_count);
                const floatDays = parseFloat(item.float_days);
                if (count > maxCount) maxCount = count;
                if (floatDays > maxFloatDays) maxFloatDays = floatDays;
            });
            
            // Adjust axes ranges with padding
            config.options.scales.x.suggestedMax = Math.ceil(maxCount * 1.1);
            config.options.scales.y.suggestedMax = Math.ceil(maxFloatDays * 1.1);

            // Group data by status
            const groupedData = {};
            data.forEach(item => {
                if (!groupedData[item.status]) {
                    groupedData[item.status] = [];
                }
                groupedData[item.status].push({
                    x: parseInt(item.activity_count),
                    y: parseFloat(item.float_days),
                    count: parseInt(item.activity_count),
                    status: item.status,
                    total: parseInt(item.total_by_status)
                });
            });

            // Create datasets
            Object.entries(groupedData).forEach(([status, points]) => {
                config.data.datasets.push({
                    label: status,
                    data: points,
                    backgroundColor: statusColors[status] || '#6B7280',
                    pointRadius: function(context) {
                        const value = context.raw.count;
                        return Math.sqrt(value) * 3;  // Increased size multiplier for better visibility
                    },
                    pointHoverRadius: function(context) {
                        const value = context.raw.count;
                        return (Math.sqrt(value) * 3) + 2;
                    }
                });
            });
        }

        return new Chart(ctx, config);
    }

    // Special handling for critical-float - scatter plot
    if (metric === 'critical-float') {
        const config = {
            type: 'scatter',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Activity Count',
                            font: {
                                size: 9
                            }
                        },
                        ticks: {
                            font: {
                                size: 8
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Float Days',
                            font: {
                                size: 9
                            }
                        },
                        ticks: {
                            font: {
                                size: 8
                            }
                        },
                        min: 0,  // Set minimum to 0
                        max: 15  // Set maximum to 15
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        align: 'center',
                        title: {
                            display: true,
                            text: 'Activity Status',
                            font: {
                                size: 9,
                                weight: 'bold'
                            }
                        },
                        labels: {
                            font: {
                                size: 8
                            },
                            padding: 4,
                            usePointStyle: true,
                            boxWidth: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return `${point.status}: ${point.count} activities, Float: ${point.y} days`;
                            }
                        }
                    }
                }
            }
        };

        // Process data for scatter plot
        if (Array.isArray(data)) {
            const statusColors = {
                'Active': '#3B82F6',  // blue-500
                'NotStart': '#10B981'  // green-500
            };

            // Group data by status
            const groupedData = {};
            data.forEach(item => {
                if (!groupedData[item.status]) {
                    groupedData[item.status] = [];
                }
                groupedData[item.status].push({
                    x: parseInt(item.activity_count),
                    y: parseFloat(item.float_days),
                    count: parseInt(item.activity_count),
                    status: item.status
                });
            });

            // Create datasets
            Object.entries(groupedData).forEach(([status, points]) => {
                config.data.datasets.push({
                    label: status,
                    data: points,
                    backgroundColor: statusColors[status] || '#6B7280',
                    pointRadius: function(context) {
                        const value = context.raw.count;
                        return Math.sqrt(value) * 2;  // Scale point size based on count
                    },
                    pointHoverRadius: function(context) {
                        const value = context.raw.count;
                        return (Math.sqrt(value) * 2) + 2;
                    }
                });
            });
        }

        return new Chart(ctx, config);
    }

    // Special handling for leads, lags, excessive-lags - stacked column chart
    if (metric === 'leads' || metric === 'lags' || metric === 'excessive-lags') {
        return createStackedColumnChart(ctx, data, metric);
    }
    
    // Default chart configuration for other metrics (fs, non-fs)
    const config = {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        font: {
                            size: 8
                        },
                        padding: 4,
                        usePointStyle: true,
                        boxWidth: 6
                    }
                }
            },
            cutout: '60%'
        }
    };
    
    // Process data based on metric type
    if (Array.isArray(data) && data.length > 0) {
        if (metric === 'open-ends') {
            // For open-ends, we want to show the details as labels and values as data
            config.data.labels = data.map(item => item.details || 'Unknown');
            config.data.datasets[0].data = data.map(item => parseInt(item.value) || 0);
        } else {
            config.data.labels = data.map(item => item.details || 'Unknown');
            config.data.datasets[0].data = data.map(item => item.value || 0);
        }
    } else if (data && typeof data === 'object') {
        // Handle object-based data
        const entries = Object.entries(data);
        if (entries.length > 0) {
            config.data.labels = entries.map(([key]) => key);
            config.data.datasets[0].data = entries.map(([, value]) => value);
        }
    }
    
    return new Chart(ctx, config);
}

function createStackedColumnChart(ctx, data, metric) {
    // Determine X-axis label based on metric
    let xAxisLabel = 'Lags';
    if (metric === 'leads') {
        xAxisLabel = 'Leads';
    } else if (metric === 'lags') {
        xAxisLabel = 'Lags';
    } else if (metric === 'excessive-lags') {
        xAxisLabel = 'Excessive Lags';
    } else if (metric === 'excessive-durations') {
        xAxisLabel = 'Excessive Durations';
    }
    
    const config = {
        type: 'bar',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: xAxisLabel,
                        font: {
                            size: 9
                        }
                    },
                    ticks: {
                        font: {
                            size: 8
                        }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count',
                        font: {
                            size: 9
                        }
                    },
                    ticks: {
                        font: {
                            size: 8
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        font: {
                            size: 8
                        },
                        padding: 4,
                        usePointStyle: true,
                        boxWidth: 6
                    }
                }
            }
        }
    };
    
    // Process stacked chart data
    if (Array.isArray(data) && data.length > 0) {
        // Group data by lag values and relationship types
        const lagGroups = {};
        const relationshipTypes = new Set();
        
        data.forEach(item => {
            const lag = item.lag || item.ExcessiveLag || 'Unknown';
            const relType = item.relationship_type || item.RelationshipType || 'Unknown';
            const count = item.count || item.value || 0;
            
            if (!lagGroups[lag]) {
                lagGroups[lag] = {};
            }
            lagGroups[lag][relType] = (lagGroups[lag][relType] || 0) + count;
            relationshipTypes.add(relType);
        });
        
        // Set labels (lag values)
        config.data.labels = Object.keys(lagGroups).sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return a.localeCompare(b);
        });
        
        // Create datasets for each relationship type
        const colors = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
        ];
        
        Array.from(relationshipTypes).forEach((relType, index) => {
            const dataset = {
                label: relType,
                data: config.data.labels.map(lag => lagGroups[lag][relType] || 0),
                backgroundColor: colors[index % colors.length],
                borderColor: colors[index % colors.length],
                borderWidth: 1
            };
            config.data.datasets.push(dataset);
        });
    }
    
    return new Chart(ctx, config);
}

function createHistoryChart(ctx, data, metric) {
    const config = {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: metric === 'excessive-durations' ? 'Excessive Duration %' : 
                       metric === 'invalid-dates' ? 'Invalid Dates %' :
                       `${metric.charAt(0).toUpperCase() + metric.slice(1)} Trend`,
                data: [],
                borderColor: metric === 'excessive-durations' ? '#9333EA' : 
                           metric === 'invalid-dates' ? '#EF4444' : 
                           '#3B82F6',
                backgroundColor: metric === 'excessive-durations' ? 'rgba(147, 51, 234, 0.1)' : 
                               metric === 'invalid-dates' ? 'rgba(239, 68, 68, 0.1)' :
                               'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 8
                        },
                        callback: function(value) {
                            // Format percentage to 1 decimal place for the 5 specific metrics
                            const targetMetrics = ['excessive-durations', 'negative-float', 'critical-float', 'excessive-float', 'riding-data-date'];
                            const isTargetMetric = targetMetrics.includes(metric);
                            
                            if (isTargetMetric) {
                                return value.toFixed(1) + '%';
                            } else {
                                return value + '%';
                            }
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 8
                        },
                        maxRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        fontSize: 9,
                        padding: 6,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // Format percentage to 1 decimal place for the 5 specific metrics
                            const targetMetrics = ['excessive-durations', 'negative-float', 'critical-float', 'excessive-float', 'riding-data-date'];
                            const isTargetMetric = targetMetrics.includes(metric);
                            
                            if (isTargetMetric) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                            } else {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                            }
                        }
                    }
                }
            }
        }
    };
    
    // Process history data
    if (Array.isArray(data) && data.length > 0) {
        config.data.labels = data.map(item => item.date || item.period || 'Period');
        config.data.datasets[0].data = data.map(item => item.value || item.percentage || 0);
    }
    
    return new Chart(ctx, config);
}

function updateTableSection(data, metric) {
    const tableConfig = getTableConfig(metric);
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    
    // Clear existing content
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (!Array.isArray(data) || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" class="text-center py-4 text-gray-500">No data available</td></tr>';
        return;
    }
    
    // Create table headers
    const headerRow = document.createElement('tr');
    tableConfig.columns.forEach(column => {
        const th = document.createElement('th');
        th.className = 'px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        th.textContent = column.title;
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
    
    // Create table rows for current page data
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        
        tableConfig.columns.forEach(column => {
            const td = document.createElement('td');
            td.className = 'px-2 py-1 text-xs text-gray-900 table-cell-compact';
            
            // Special formatting for Total Float Days - make it a whole number
            if (column.field === 'Total Float Days' && row[column.field]) {
                const floatValue = parseFloat(row[column.field]);
                td.textContent = isNaN(floatValue) ? row[column.field] : Math.round(floatValue).toString();
            } else {
                td.textContent = row[column.field] || '';
            }
            
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
}

// Pagination functions
function updatePaginationControls() {
    console.log('updatePaginationControls called - currentPage:', currentPage, 'totalPages:', totalPages, 'totalRecords:', totalRecords);
    
    const paginationInfo = document.getElementById('pagination-info');
    const currentPageInput = document.getElementById('current-page-input');
    const totalPagesSpan = document.getElementById('total-pages');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageSizeSelect = document.getElementById('page-size-select');
    
    if (!paginationInfo || !currentPageInput || !totalPagesSpan || !prevButton || !nextButton || !pageSizeSelect) {
        console.error('Pagination controls not found in DOM');
        return;
    }
    
    // Update pagination info
    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);
    paginationInfo.textContent = `Showing ${startRecord} to ${endRecord} of ${totalRecords} records`;
    
    // Update page input and total pages
    currentPageInput.value = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    // Update button states
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
    
    // Update page size select
    pageSizeSelect.value = pageSize;
    
    console.log('Pagination controls updated successfully');
}

function goToPage(page) {
    console.log('goToPage called with page:', page, 'totalPages:', totalPages, 'currentMetric:', currentMetric);
    
    if (page < 1 || page > totalPages) {
        console.log('Invalid page number:', page);
        return;
    }
    
    currentPage = page;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = allTableData.slice(startIndex, endIndex);
    
    console.log('Updating table with page data:', currentPageData.length, 'records');
    updateTableSection(currentPageData, currentMetric);
    updatePaginationControls();
}

function changePageSize(newPageSize) {
    pageSize = parseInt(newPageSize);
    totalPages = Math.ceil(totalRecords / pageSize);
    currentPage = 1;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = allTableData.slice(startIndex, endIndex);
    
    updateTableSection(currentPageData, currentMetric);
    updatePaginationControls();
}

function setupPaginationEventListeners() {
    // Use event delegation for better reliability
    document.addEventListener('click', (e) => {
        if (e.target.id === 'prev-page') {
            console.log('Previous button clicked, current page:', currentPage);
            e.preventDefault();
            goToPage(currentPage - 1);
        } else if (e.target.id === 'next-page') {
            console.log('Next button clicked, current page:', currentPage);
            e.preventDefault();
            goToPage(currentPage + 1);
        }
    });
    
    document.addEventListener('change', (e) => {
        if (e.target.id === 'current-page-input') {
            const page = parseInt(e.target.value);
            if (page >= 1 && page <= totalPages) {
                goToPage(page);
            } else {
                e.target.value = currentPage; // Reset to current page if invalid
            }
        } else if (e.target.id === 'page-size-select') {
            changePageSize(e.target.value);
        }
    });
    
    console.log('Pagination event listeners set up using event delegation');
}

function getTableConfig(metric) {
    const configs = {
        'leads': {
            columns: [
                { field: 'Pred. ID', title: 'Pred. ID' },
                { field: 'Succ. ID', title: 'Succ. ID' },
                { field: 'Pred. Name', title: 'Pred. Name' },
                { field: 'Succ. Name', title: 'Succ. Name' },
                { field: 'Relationship type', title: 'Relationship Type' },
                { field: 'Lag', title: 'Lag' },
                { field: 'Lead', title: 'Lead' },
                { field: 'ExcessiveLag', title: 'Excessive Lag' },
                { field: 'Driving', title: 'Driving' },
                { field: 'FreeFloat', title: 'Free Float' },
                { field: 'Relationship_Status', title: 'Rel. Status' }
            ]
        },
        'lags': {
            columns: [
                { field: 'Pred. ID', title: 'Pred. ID' },
                { field: 'Succ. ID', title: 'Succ. ID' },
                { field: 'Pred. Name', title: 'Pred. Name' },
                { field: 'Succ. Name', title: 'Succ. Name' },
                { field: 'Relationship type', title: 'Relationship Type' },
                { field: 'Lag', title: 'Lag' },
                { field: 'Lead', title: 'Lead' },
                { field: 'ExcessiveLag', title: 'Excessive Lag' },
                { field: 'Driving', title: 'Driving' },
                { field: 'FreeFloat', title: 'Free Float' },
                { field: 'Relationship_Status', title: 'Rel. Status' }
            ]
        },
        'excessive-lags': {
            columns: [
                { field: 'Pred. ID', title: 'Pred. ID' },
                { field: 'Succ. ID', title: 'Succ. ID' },
                { field: 'Pred. Name', title: 'Pred. Name' },
                { field: 'Succ. Name', title: 'Succ. Name' },
                { field: 'Relationship type', title: 'Relationship Type' },
                { field: 'Lag', title: 'Lag' },
                { field: 'Lead', title: 'Lead' },
                { field: 'ExcessiveLag', title: 'Excessive Lag' },
                { field: 'Driving', title: 'Driving' },
                { field: 'FreeFloat', title: 'Free Float' },
                { field: 'Relationship_Status', title: 'Rel. Status' }
            ]
        },
        'fs': {
            columns: [
                { field: 'Pred. ID', title: 'Pred. ID' },
                { field: 'Succ. ID', title: 'Succ. ID' },
                { field: 'Pred. Name', title: 'Pred. Name' },
                { field: 'Succ. Name', title: 'Succ. Name' },
                { field: 'Relationship type', title: 'Relationship Type' },
                { field: 'Lag', title: 'Lag' },
                { field: 'Lead', title: 'Lead' },
                { field: 'ExcessiveLag', title: 'Excessive Lag' },
                { field: 'Driving', title: 'Driving' },
                { field: 'FreeFloat', title: 'Free Float' },
                { field: 'Relationship_Status', title: 'Rel. Status' }
            ]
        },
        'non-fs': {
            columns: [
                { field: 'Pred. ID', title: 'Pred. ID' },
                { field: 'Succ. ID', title: 'Succ. ID' },
                { field: 'Pred. Name', title: 'Pred. Name' },
                { field: 'Succ. Name', title: 'Succ. Name' },
                { field: 'Relationship type', title: 'Relationship Type' },
                { field: 'Lag', title: 'Lag' },
                { field: 'Lead', title: 'Lead' },
                { field: 'ExcessiveLag', title: 'Excessive Lag' },
                { field: 'Driving', title: 'Driving' },
                { field: 'FreeFloat', title: 'Free Float' },
                { field: 'Relationship_Status', title: 'Rel. Status' }
            ]
        },
        'open-ends': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Original Duration', title: 'Original Duration' },
                { field: 'Total Float Days', title: 'Total Float Days' },
                { field: 'Missing Predecessor', title: 'Missing Predecessor' },
                { field: 'Missing Successor', title: 'Missing Successor' },
                { field: 'Primary Constraint', title: 'Primary Constraint' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' }
            ]
        },
        'constraints': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Original Duration', title: 'Original Duration' },
                { field: 'Total Float Days', title: 'Total Float Days' },
                { field: 'Primary Constraint', title: 'Primary Constraint' },
                { field: 'Hard/Soft', title: 'Hard/Soft' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' },
                { field: 'Open End', title: 'Open End' }
            ]
        },
        'excessive-durations': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Original Duration', title: 'Original Duration' },
                { field: 'Total Float Days', title: 'Total Float Days' },
                { field: 'Primary Constraint', title: 'Primary Constraint' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' }
            ]
        },
        'negative-float': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Original Duration', title: 'Original Duration' },
                { field: 'Total Float Days', title: 'Total Float Days' },
                { field: 'Primary Constraint', title: 'Primary Constraint' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' }
            ]
        },
        'critical-float': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Original Duration', title: 'Original Duration' },
                { field: 'Total Float Days', title: 'Total Float Days' },
                { field: 'Primary Constraint', title: 'Primary Constraint' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' }
            ]
        },
        'excessive-float': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Original Duration', title: 'Original Duration' },
                { field: 'Total Float Days', title: 'Total Float Days' },
                { field: 'Primary Constraint', title: 'Primary Constraint' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' }
            ]
        },
        'invalid-dates': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Invalid Start', title: 'Invalid Start' },
                { field: 'Invalid Finish', title: 'Invalid Finish' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' }
            ]
        },
        'riding-data-date': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Original Duration', title: 'Original Duration' },
                { field: 'Total Float Days', title: 'Total Float Days' },
                { field: 'Primary Constraint', title: 'Primary Constraint' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' },
                { field: 'Riding Data Date', title: 'Riding Data Date' }
            ]
        },
        'resources': {
            columns: [
                { field: 'Activity ID', title: 'Activity ID' },
                { field: 'Activity Name', title: 'Activity Name' },
                { field: 'Start Date', title: 'Start Date' },
                { field: 'Finish Date', title: 'Finish Date' },
                { field: 'Original Duration', title: 'Original Duration' },
                { field: 'Total Float Days', title: 'Total Float Days' },
                { field: 'Primary Constraint', title: 'Primary Constraint' },
                { field: 'Activity Type', title: 'Activity Type' },
                { field: 'Activity Status', title: 'Activity Status' },
                { field: 'Resource', title: 'Resource' }
            ]
        }
    };
    
    return configs[metric] || configs['leads'];
}

// Export functions
async function exportToPDF(sectionId, filename) {
    try {
        const element = document.getElementById(sectionId);
        const canvas = await html2canvas(element);
        const imgData = canvas.toDataURL('image/png');
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        const imgWidth = 190;
        const pageHeight = pdf.internal.pageSize.height;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        let position = 10;
        
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showError('Failed to export PDF');
    }
}

function exportToExcel(filename) {
    try {
        if (currentMetric) {
            // For now, we'll export as CSV
            fetchTableData(currentMetric).then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const csv = convertToCSV(data);
                    downloadCSV(csv, `${filename}.csv`);
                }
            });
        }
    } catch (error) {
        console.error('Error exporting Excel:', error);
        showError('Failed to export Excel');
    }
}

async function exportToImage(sectionId, filename) {
    try {
        const element = document.getElementById(sectionId);
        const canvas = await html2canvas(element);
        
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (error) {
        console.error('Error exporting image:', error);
        showError('Failed to export image');
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return csvContent;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility functions
function showLoading() {
    // Could add a loading spinner here
    console.log('Loading...');
}

function hideLoading() {
    // Hide loading spinner
    console.log('Loading complete');
}

function showError(message) {
    // Could add a toast notification or alert
    console.error('Error:', message);
    alert(message);
}

// Make functions available globally for onclick handlers
window.exportToPDF = exportToPDF;
window.exportToExcel = exportToExcel;
window.exportToImage = exportToImage;

// Full page export functions for header buttons
async function exportFullPageToPDF() {
    try {
        const mainContent = document.querySelector('main');
        const canvas = await html2canvas(mainContent, {
            scale: 1,
            useCORS: true,
            allowTaint: true
        });
        
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;
        
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
        const filename = `schedule-drilldown-${currentMetric}-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);
        
        console.log('Full page exported to PDF successfully');
    } catch (error) {
        console.error('Error exporting full page to PDF:', error);
        showError('Failed to export page to PDF');
    }
}

async function exportFullPageToExcel() {
    try {
        // Get all table data for Excel export
        const tableData = await fetchTableData(currentMetric);
        
        if (!Array.isArray(tableData) || tableData.length === 0) {
            showError('No data available to export');
            return;
        }
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Add main data sheet
        const ws = XLSX.utils.json_to_sheet(tableData);
        XLSX.utils.book_append_sheet(wb, ws, `${currentMetric} Data`);
        
        // Add KPI summary if available
        try {
            const kpiData = await fetchKPIData(currentMetric);
            if (kpiData) {
                const kpiArray = Object.entries(kpiData).map(([key, value]) => ({
                    'Metric': key,
                    'Value': value
                }));
                const kpiWs = XLSX.utils.json_to_sheet(kpiArray);
                XLSX.utils.book_append_sheet(wb, kpiWs, 'KPI Summary');
            }
        } catch (error) {
            console.warn('Could not add KPI data to Excel:', error);
        }
        
        // Save file
        const filename = `schedule-drilldown-${currentMetric}-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        console.log('Full page exported to Excel successfully');
    } catch (error) {
        console.error('Error exporting full page to Excel:', error);
        showError('Failed to export page to Excel');
    }
}

async function exportFullPageToImage() {
    try {
        const mainContent = document.querySelector('main');
        const canvas = await html2canvas(mainContent, {
            scale: 2, // Higher quality
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f3f4f6' // Match the page background
        });
        
        // Create download link
        const link = document.createElement('a');
        const filename = `schedule-drilldown-${currentMetric}-${new Date().toISOString().split('T')[0]}.png`;
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Full page exported to image successfully');
    } catch (error) {
        console.error('Error exporting full page to image:', error);
        showError('Failed to export page to image');
    }
} 