/**
 * Collapsible Sidebar Navigation
 * This script provides functionality for collapsible sidebar navigation
 * that remembers state across pages using localStorage
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar functionality
    initializeSidebar();
    
    // Initialize WBS navigation processing
    initializeWbsNavigation();
});

function initializeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    
    if (!sidebar || !mainContent || !toggleBtn) {
        console.warn('Sidebar elements not found');
        return;
    }
    
    // Load saved state from localStorage
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    // Function to update sidebar state
    function updateSidebarState(collapsed) {
        if (collapsed) {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
            mainContent.classList.remove('sidebar-expanded');
            mainContent.classList.add('sidebar-collapsed');
            toggleBtn.classList.remove('sidebar-expanded');
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        } else {
            sidebar.classList.remove('collapsed');
            sidebar.classList.add('expanded');
            mainContent.classList.remove('sidebar-collapsed');
            mainContent.classList.add('sidebar-expanded');
            toggleBtn.classList.add('sidebar-expanded');
            toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        }
        
        // Save state to localStorage
        localStorage.setItem('sidebarCollapsed', collapsed);
        
        // Trigger window resize event to help charts and other components adjust
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    }
    
    // Initialize with saved state
    updateSidebarState(isCollapsed);
    
    // Add click event listener to toggle button
    toggleBtn.addEventListener('click', function() {
        const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
        updateSidebarState(!isCurrentlyCollapsed);
    });
    
    // Handle keyboard shortcuts (optional)
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + B to toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
            updateSidebarState(!isCurrentlyCollapsed);
        }
    });
}

function initializeWbsNavigation() {
    // Function to process sidebar WBS links when they're added to the DOM
    function processWbsNavigation() {
        // Get all links in the sidebar that are not main navigation links
        const mainNavLinks = Array.from(document.querySelectorAll('.sidebar-nav > nav > a'));
        const allLinks = Array.from(document.querySelectorAll('.sidebar-nav a'));
        const wbsLinks = allLinks.filter(link => !mainNavLinks.includes(link));
        
        let hasDeepLevels = false;
        
        // Process each WBS link
        wbsLinks.forEach(link => {
            // Count levels based on dashes, dots, or other delimiters
            const text = link.textContent.trim();
            const level = (text.match(/[.-]/g) || []).length + 1;
            
            // Add level attribute
            link.setAttribute('data-wbs-level', level);
            
            // Hide deep levels by default
            if (level > 3) {
                hasDeepLevels = true;
                link.style.display = 'none';
            }
        });
        
        // Show toggle if we have deep levels
        const wbsToggle = document.getElementById('wbsToggle');
        if (wbsToggle && hasDeepLevels) {
            wbsToggle.style.display = 'block';
            
            // Add click handler if not already added
            if (!wbsToggle.hasAttribute('data-initialized')) {
                wbsToggle.setAttribute('data-initialized', 'true');
                wbsToggle.addEventListener('click', function() {
                    const isExpanded = this.textContent === 'Show Less';
                    const deepWbsLinks = document.querySelectorAll(
                        '.sidebar-nav a[data-wbs-level="4"], ' +
                        '.sidebar-nav a[data-wbs-level="5"], ' +
                        '.sidebar-nav a[data-wbs-level="6"], ' +
                        '.sidebar-nav a[data-wbs-level="7"], ' +
                        '.sidebar-nav a[data-wbs-level="8"], ' +
                        '.sidebar-nav a[data-wbs-level="9"]'
                    );
                    
                    deepWbsLinks.forEach(link => {
                        link.style.display = isExpanded ? 'none' : 'block';
                    });
                    
                    this.textContent = isExpanded ? 'Show More' : 'Show Less';
                });
            }
        }
    }
    
    // Set up a MutationObserver to watch for changes to the sidebar
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) {
        const observer = new MutationObserver(function(mutations) {
            processWbsNavigation();
        });
        
        observer.observe(sidebarNav, { 
            childList: true, 
            subtree: true 
        });
        
        // Also process on load
        processWbsNavigation();
    }
}

/**
 * Function to get the current page name for highlighting active navigation
 */
function getCurrentPageName() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    return page;
}

/**
 * Function to highlight the active navigation item
 */
function highlightActiveNavigation() {
    const currentPage = getCurrentPageName();
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.classList.remove('text-gray-300');
            link.classList.add('bg-blue-800', 'text-white');
        } else if (!href || !href.startsWith('http')) {
            link.classList.add('text-gray-300');
            link.classList.remove('bg-blue-800', 'text-white');
        }
    });
}

// Call highlight function on load
document.addEventListener('DOMContentLoaded', highlightActiveNavigation); 