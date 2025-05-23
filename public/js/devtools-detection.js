/**
 * DevTools Detection Script - iOS Compatible
 * This script detects actual DevTools usage while preventing false positives on iOS
 */

(function() {
    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Variables to track state
    let devtoolsOpen = false;
    let warningShown = false;
    const threshold = 160; // Size threshold for detection
    
    // Don't apply aggressive detection on iOS
    if (!isIOS) {
        // Method 1: Size-based detection (non-iOS only)
        const checkDevTools = function() {
            // Only run this check if we haven't shown a warning yet
            if (!warningShown) {
                const widthThreshold = window.outerWidth - window.innerWidth > threshold;
                const heightThreshold = window.outerHeight - window.innerHeight > threshold;
                
                if (widthThreshold || heightThreshold) {
                    if (!devtoolsOpen) {
                        devtoolsOpen = true;
                        showWarning();
                    }
                } else {
                    devtoolsOpen = false;
                }
            }
        };
        
        // Method 2: Use console.log timing difference for detection (non-iOS only)
        const checkDevToolsViaConsole = function() {
            if (!warningShown) {
                const startTime = performance.now();
                console.log('%c', 'font-size:0;padding:" + 100000 + "px;');
                const endTime = performance.now();
                
                if (endTime - startTime > 100) {
                    devtoolsOpen = true;
                    showWarning();
                }
            }
        };
        
        // Run checks at intervals
        setInterval(checkDevTools, 1000);
        setInterval(checkDevToolsViaConsole, 2000);
    }
    
    // Function to show warning
    function showWarning() {
        if (!warningShown) {
            warningShown = true;
            
            // Create modal element
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(52, 58, 64, 0.9)';
            modal.style.zIndex = '9999';
            modal.style.display = 'flex';
            modal.style.flexDirection = 'column';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.textAlign = 'center';
            modal.style.color = 'white';
            modal.style.fontFamily = 'Arial, sans-serif';
            
            // Create content
            const content = document.createElement('div');
            content.style.backgroundColor = '#212529';
            content.style.padding = '30px';
            content.style.borderRadius = '8px';
            content.style.maxWidth = '400px';
            
            content.innerHTML = `
                <h2 style="margin-top:0;">DevTools terdeteksi</h2>
                <p>Silahkan tutup DevTools untuk melanjutkan.</p>
                <button id="close-warning-btn" style="background-color:#0d6efd;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-top:20px;">Oke, Saya Mengerti</button>
            `;
            
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            // Add button listener
            document.getElementById('close-warning-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
                warningShown = false;
                
                // Check again after button is clicked, in case DevTools is still open
                setTimeout(function() {
                    if (devtoolsOpen) {
                        showWarning();
                    }
                }, 500);
            });
        }
    }
})();
