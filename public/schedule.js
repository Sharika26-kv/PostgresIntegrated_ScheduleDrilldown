// Import modules
import { loadProjects } from './js/modules/state.js';
import { state, elements, initializeElements, updatePageTitle, setLoadingState } from './js/modules/state.js';
import { formatDate, displayNoDataMessage, showGanttLoading, showGanttError } from './js/modules/utils.js';
import { renderGanttChart, updateGanttChart, filterGanttData, loadGanttData } from './js/modules/gantt.js';
import { initializeTabs, showTab } from './js/modules/tabHandler.js';
import { generateFloatAnalysisReport } from './js/modules/floatAnalysis.js';
import { AWP_LEVEL1_MAPPING, AWP_LEVEL2_MAPPING, AWP_LEVEL3_MAPPING, AWP_LEVEL4_MAPPING, AWP_LEVEL5_MAPPING, AWP_LEVEL6_MAPPING } from './config/awpMappings.js';

// Sequentially load Gantt data for a project
async function onProjectSelected(projectId) {
    showGanttLoading(true);
    await loadGanttData(projectId); // Gantt first
    await fetchAndShowFloatAnalysis(projectId); // Load Float Analysis data
    showGanttLoading(false);
}

// Load Float Analysis data for a project
async function fetchAndShowFloatAnalysis(projectId) {
    if (!projectId) return;
    
    try {
        // Load the Float Analysis tab data
        await generateFloatAnalysisReport(null, projectId); // null for xerData, pass projectId
    } catch (err) {
        console.error('Failed to load Float Analysis data:', err);
    }
}

// Initialize DOM elements when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[DOM] Content loaded, initializing schedule application...');
    
    // Initialize elements and state
    await initializeElements();
    initializeTabs();
    setupEventListeners(); // CRITICAL: Setup event listeners for project selection
    
    // Load initial projects data
    try {
        await loadProjects();
        console.log('[DOM] Projects loaded successfully');
    } catch (error) {
        console.error('[DOM] Failed to load projects:', error);
    }
    
    console.log('[DOM] Schedule application initialized');
});

// Setup event listeners
function setupEventListeners() {
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
        projectFilter.addEventListener('change', (e) => {
            const projectId = e.target.value;
            if (projectId) {
                state.currentProject = projectId;
                localStorage.setItem('selectedProjectId', projectId); // Persist selection
                
                // Update current project display
                const currentProjectIdSpan = document.getElementById('currentProjectId');
                if (currentProjectIdSpan) {
                    currentProjectIdSpan.textContent = projectId;
                }
                
                console.log('[Schedule] Project selected:', projectId);
                onProjectSelected(projectId);
            }
        });
    }
}

// Export state for debugging
window.state = state;

// Export functions to window for external access (if needed)
window.onProjectSelected = onProjectSelected;
window.fetchAndShowFloatAnalysis = fetchAndShowFloatAnalysis;