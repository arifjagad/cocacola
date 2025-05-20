// Toast notification function
function showToast(message, type = 'info') {
  // Remove existing toast if present
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  
  // Set styles based on type
  let bgColor, textColor, icon;
  switch (type) {
    case 'error':
      bgColor = 'bg-red-500';
      textColor = 'text-white';
      icon = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
              </svg>`;
      break;
    case 'success':
      bgColor = 'bg-green-500';
      textColor = 'text-white';
      icon = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>`;
      break;
    default:
      bgColor = 'bg-blue-500';
      textColor = 'text-white';
      icon = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>`;
  }
  
  // Apply classes and add content
  toast.className = `fixed top-4 right-4 z-50 max-w-xs shadow-lg rounded-lg flex items-center p-4 ${bgColor} ${textColor} transform transition-all duration-300 ease-in-out`;
  toast.innerHTML = `
    <div class="flex items-center">
      ${icon}
      <span>${message}</span>
    </div>
    <button class="ml-4 focus:outline-none" onclick="this.parentElement.remove()">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
      </svg>
    </button>
  `;
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Add entrance animation
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          toast.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Function to claim code via API
async function claimCode(packagingCode, authorization) {
  try {
    // Get DOM elements for updating UI
    const resultDisplay = document.getElementById('result-display');
    const attemptCounter = document.getElementById('attempt-counter');
    const progressBar = document.getElementById('progress-bar');
    
    // Clear previous results
    resultDisplay.innerHTML = '';
    
    // Update UI to show we're starting
    attemptCounter.textContent = `Starting claim process...`;
    progressBar.style.width = `5%`;
    
    // Make API call to our Express backend
    const response = await fetch('/api/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packagingCode,
        authorization
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Update progress to complete
    progressBar.style.width = '100%';
    attemptCounter.textContent = `Completed after ${result.attempts} attempts`;
    
    // Create result entry
    const logEntry = document.createElement('div');
    
    if (result.success) {
      // Success case
      logEntry.className = 'p-2 mb-2 bg-green-100 text-green-800 rounded';
      logEntry.innerHTML = `<strong>Success on attempt ${result.attempts}:</strong><br> ${JSON.stringify(result.result, null, 2)}`;
    } else {
      // Error case
      switch (result.status) {
        case 'LIMIT_REACHED':
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded font-bold';
          logEntry.textContent = `⚠️ ${result.message}`;
          break;
        case 'INVALID_CODE':
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded font-bold';
          logEntry.textContent = `❌ ${result.message}`;
          break;
        case 'MAX_ATTEMPTS':
          logEntry.className = 'p-2 mb-2 bg-yellow-100 text-yellow-800 rounded';
          logEntry.textContent = `⚠️ ${result.message}`;
          break;
        default:
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
          logEntry.innerHTML = `<strong>Error:</strong><br> ${JSON.stringify(result, null, 2)}`;
      }
    }
    
    // Add the result to the display
    resultDisplay.prepend(logEntry);
    
    // Re-enable the start button
    document.getElementById('start-button').disabled = false;
    document.getElementById('start-button').textContent = 'Start Claim';
    
    return result;
  } catch (error) {
    console.error('Error claiming code:', error);
    
    // Show error in the result display
    const resultDisplay = document.getElementById('result-display');
    const logEntry = document.createElement('div');
    logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
    logEntry.textContent = `Error: ${error.message}`;
    resultDisplay.prepend(logEntry);
    
    // Re-enable the start button
    document.getElementById('start-button').disabled = false;
    document.getElementById('start-button').textContent = 'Start Claim';
    
    // Update toast
    showToast(`Error: ${error.message}`, 'error');
    
    return null;
  }
}

// Initialize UI when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('start-button');
  
  // Existing click event for the start button
  startButton.addEventListener('click', function() {
    const packagingCode = document.getElementById('packaging-code').value;
    const authorization = document.getElementById('authorization').value;
    
    if (!packagingCode || !authorization) {
      // Replace alert with toast notification
      showToast('Please fill in both Packaging Code and Authorization Token', 'error');
      return;
    }
    
    // Update button state
    this.disabled = true;
    this.textContent = 'Processing...';
    
    // Reset progress
    document.getElementById('progress-bar').style.width = '0%';
    
    // Start the claim process
    claimCode(packagingCode, authorization);
  });
});
