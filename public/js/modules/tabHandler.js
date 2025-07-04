// tabHandler.js - Handles tab switching functionality
import { state, setActiveTab as updateStateActiveTab } from './state.js';
import { generateFloatAnalysisReport } from './floatAnalysis.js';

/**
 * Initializes the tab functionality
 */
export function initializeTabs() {
    // Get tab buttons
    const ganttTabBtn = document.getElementById('ganttTabBtn');
    const floatAnalysisTabBtn = document.getElementById('floatAnalysisTabBtn');
    
    // Get tab panels
    const ganttTabPanel = document.getElementById('ganttTabPanel');
    const floatAnalysisTabPanel = document.getElementById('floatAnalysisTabPanel');
    
    // Add click event listeners to tab buttons
    if (ganttTabBtn) {
        ganttTabBtn.addEventListener('click', () => {
            showTab('ganttTabPanel');
            setActiveTab(ganttTabBtn);
            updateStateActiveTab('gantt');
        });
    }
    
    if (floatAnalysisTabBtn) {
        floatAnalysisTabBtn.addEventListener('click', () => {
            console.log('[TabHandler] Float Analysis tab clicked.');
            showTab('floatAnalysisTabPanel');
            setActiveTab(floatAnalysisTabBtn);
            updateStateActiveTab('floatAnalysis');

            // CRITICAL: Ensure DOM is updated and then fetch/generate report
            setTimeout(async () => { // Use async function for fetch
                 // Get the current project ID from state
                const currentProjectId = state.currentProject; // Project ID is stored directly

                if (!currentProjectId) {
                    console.warn('[TabHandler] No current project ID available to fetch Float Analysis data.');
                    generateFloatAnalysisReport(null, null); // Call with null parameters
                    return;
                }

                console.log('[TabHandler] Attempting to fetch Float Analysis for project ID:', currentProjectId);

                try {
                    // Use the updated generateFloatAnalysisReport function that fetches data internally
                    await generateFloatAnalysisReport(null, currentProjectId);
                    console.log('[TabHandler] Float Analysis report generated successfully');
                } catch (error) {
                    console.error('[TabHandler] Error generating Float Analysis report:', error);
                    generateFloatAnalysisReport(null, null); // Generate empty report on error
                }
            }, 100); // Small delay to ensure DOM is ready
        });
    }
    
    // Initialize with the active tab from state
    initializeActiveTab();
}

/**
 * Initializes the active tab based on the current state
 */
function initializeActiveTab() {
    // Get the current active tab from state
    const activeTab = state.activeTab;
    
    // Set the active tab based on state
    switch (activeTab) {
        case 'floatAnalysis':
            showTab('floatAnalysisTabPanel');
            setActiveTab(document.getElementById('floatAnalysisTabBtn'));
            break;
        case 'gantt':
        default:
            showTab('ganttTabPanel');
            setActiveTab(document.getElementById('ganttTabBtn'));
            break;
    }
}

/**
 * Shows the specified tab panel and hides others
 * @param {string} tabPanelId - The ID of the tab panel to show
 */
export function showTab(tabPanelId) {
    // Hide all tab panels
    document.getElementById('ganttTabPanel').style.display = 'none';
    const floatAnalysisTabPanel = document.getElementById('floatAnalysisTabPanel');
    if (floatAnalysisTabPanel) {
        floatAnalysisTabPanel.style.display = 'none';
    }
    
    // Remove active class from all panels
    document.getElementById('ganttTabPanel').classList.remove('active');
    if (floatAnalysisTabPanel) {
        floatAnalysisTabPanel.classList.remove('active');
    }
    
    // Show the selected tab panel and add active class
    const tabPanel = document.getElementById(tabPanelId);
    if (tabPanel) {
        tabPanel.classList.add('active');
        
        // Set proper display style based on panel type
        if (tabPanelId === 'floatAnalysisTabPanel') {
            tabPanel.style.display = 'flex';
        } else {
            tabPanel.style.display = 'block';
        }
        
        // CRITICAL: Force chart to redraw
        if ((tabPanelId === 'floatAnalysisTabPanel') && window.floatAnalysisChartInstance) {
            setTimeout(() => {
                window.floatAnalysisChartInstance.resize();
                window.floatAnalysisChartInstance.update();
                console.log(`[${tabPanelId}] Chart instance resized and updated`);
            }, 100);
        } else if (window.floatAnalysisChartInstance) {
            window.floatAnalysisChartInstance.destroy();
            window.floatAnalysisChartInstance = null;
        }
    } else {
        console.error(`[TabHandler] Tab panel with ID "${tabPanelId}" not found.`);
    }
}

/**
 * Sets the active tab button style
 * @param {HTMLElement} activeTabBtn - The active tab button element
 */
function setActiveTab(activeTabBtn) {
    // Remove active class from all tab buttons
    const allTabButtons = document.querySelectorAll('.tab-button');
    allTabButtons.forEach(btn => {
        btn.classList.remove('border-blue-600', 'text-blue-600');
        btn.classList.add('text-gray-500');
    });
    
    // Add active class to the clicked tab button
    if (activeTabBtn) {
        activeTabBtn.classList.remove('text-gray-500');
        activeTabBtn.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
    } else {
        console.warn('[TabHandler] Active tab button not found.');
    }
} 