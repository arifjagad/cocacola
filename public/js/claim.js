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

// Function to extract token from Coca-Cola link
async function extractToken(cocaColaLink) {
  try {
    const tokenStatus = document.getElementById('token-status');
    const extractionAttempt = document.getElementById('extraction-attempt');
    tokenStatus.classList.remove('hidden');
    
    // Start a counter to show how long we've been trying
    let seconds = 0;
    const extractionTimer = setInterval(() => {
      seconds++;
      extractionAttempt.textContent = `Percobaan sedang berlangsung selama ${seconds} detik...`;
    }, 1000);
    
    const response = await fetch('/api/extract-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cocaColaLink })
    });
    
    // Clear the timer
    clearInterval(extractionTimer);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Gagal mengambil kode: ${response.status}`);
    }
    
    const data = await response.json();
    tokenStatus.classList.add('hidden');
    
    if (!data.success) {
      throw new Error(data.message || 'Gagal mengambil kode akses dari link');
    }
    
    return data.token;
  } catch (error) {
    document.getElementById('token-status').classList.add('hidden');
    throw error;
  }
}

// Function to determine the success message based on the response data
function getSuccessMessage(responseData) {
  try {
    // First check in the result.result structure (when data is in a nested format)
    if (responseData && 
        responseData.parsedData && 
        responseData.parsedData.result && 
        responseData.parsedData.result.campaign_public_settings && 
        responseData.parsedData.result.campaign_public_settings.public_name) {
      
      const publicName = responseData.parsedData.result.campaign_public_settings.public_name;
      
      // Check for specific public_name values
      if (publicName === "public-ayo-cola-utc-cinepolis-b1f1") {
        return "Mendapatkan Voucher Cinepolis B1G1";
      } else if (publicName === "public-ayo-cola-utc-cinepolis-free") {
        return "Mendapatkan 1 Voucher Gratis Cinepolis";
      }
    }
    
    // Also check directly in the response structure (when data is directly in result)
    if (responseData && 
        responseData.result && 
        responseData.result.campaign_public_settings && 
        responseData.result.campaign_public_settings.public_name) {
      
      const publicName = responseData.result.campaign_public_settings.public_name;
      
      // Check for specific public_name values
      if (publicName === "public-ayo-cola-utc-cinepolis-b1f1") {
        return "Mendapatkan Voucher Cinepolis B1G1";
      } else if (publicName === "public-ayo-cola-utc-cinepolis-free") {
        return "Mendapatkan 1 Voucher Gratis Cinepolis";
      }
    }
    
    // Default case - return a generic success message
    return "Berhasil claim kode";
  } catch (error) {
    console.error("Error parsing success message:", error);
    return "Berhasil claim kode";
  }
}

// Function to claim code via API
async function claimCode(packagingCode, authorization) {
  try {
    // Get DOM elements for updating UI
    const resultDisplay = document.getElementById('result-display');
    const attemptCounter = document.getElementById('attempt-counter');
    const progressBar = document.getElementById('progress-bar');
    
    // Clear previous results completely
    resultDisplay.innerHTML = '';
    
    // Update UI to show we're starting
    attemptCounter.textContent = `Memulai proses claim...`;
    progressBar.style.width = `5%`;
    
    // Create a realtime attempt status display that will be updated
    const realtimeStatusDiv = document.createElement('div');
    realtimeStatusDiv.id = 'realtime-status';
    realtimeStatusDiv.className = 'p-2 mb-2 bg-blue-100 text-blue-800 rounded';
    realtimeStatusDiv.innerHTML = `<span class="font-medium">Sedang memproses...</span>`;
    resultDisplay.prepend(realtimeStatusDiv);
    
    // Set up event source for real-time updates
    const eventSource = new EventSource('/api/attempt-events');
    
    // Update the UI with each attempt
    eventSource.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.attempt) {
          const attemptNum = data.attempt;
          
          // Update the realtime status display
          realtimeStatusDiv.innerHTML = `<span class="font-medium">Mencoba: Percobaan ke-${attemptNum}</span>`;
          
          // Update the progress counter
          attemptCounter.textContent = `Sedang berjalan: Percobaan ke-${attemptNum}`;
          
          // Update the progress bar (assuming max 100 attempts)
          const progressPercent = Math.min(5 + (attemptNum / 100 * 95), 95);
          progressBar.style.width = `${progressPercent}%`;
        }
      } catch (e) {
        console.error('Error parsing SSE data:', e);
      }
    };
    
    eventSource.onerror = function() {
      console.log('SSE connection closed or errored');
      eventSource.close();
    };
    
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
    
    // Close the event source
    eventSource.close();
    
    if (!response.ok) {
      throw new Error(`Server merespon dengan status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Remove the realtime status div
    if (document.getElementById('realtime-status')) {
      document.getElementById('realtime-status').remove();
    }
    
    // Update progress to complete
    progressBar.style.width = '100%';
    attemptCounter.textContent = `Selesai setelah ${result.attempts} percobaan`;
    
    // Create result entry
    const logEntry = document.createElement('div');
    
    if (result.success) {
      // Success case - Get custom message based on response data
      const successMessage = getSuccessMessage(result.result);
      
      logEntry.className = 'p-2 mb-2 bg-green-100 text-green-800 rounded';
      logEntry.innerHTML = `<strong>${successMessage}</strong><br><span class="text-xs">(${result.attempts} percobaan)</span><br>${JSON.stringify(result.result, null, 2)}`;
      showToast(successMessage, 'success');
    } else {
      // Error case
      switch (result.status) {
        case 'LIMIT_REACHED':
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded font-bold';
          logEntry.textContent = `⚠️ ${result.message}`;
          showToast(result.message, 'error');
          break;
        case 'INVALID_CODE':
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded font-bold';
          logEntry.textContent = `❌ ${result.message}`;
          showToast(result.message, 'error');
          break;
        case 'MAX_ATTEMPTS':
          logEntry.className = 'p-2 mb-2 bg-yellow-100 text-yellow-800 rounded';
          logEntry.textContent = `⚠️ ${result.message}`;
          showToast(result.message, 'error');
          break;
        default:
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
          logEntry.innerHTML = `<strong>Error:</strong><br> ${JSON.stringify(result, null, 2)}`;
          showToast('Terjadi kesalahan saat memproses permintaan', 'error');
      }
    }
    
    // Add the result to the display
    resultDisplay.prepend(logEntry);
    
    // Re-enable the start button
    document.getElementById('start-button').disabled = false;
    document.getElementById('start-button').textContent = 'Mulai Claim';
    
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
    document.getElementById('start-button').textContent = 'Mulai Claim';
    
    // Update toast
    showToast(`Error: ${error.message}`, 'error');
    
    return null;
  }
}

// Function to update the attempt display
function updateAttemptDisplay(attemptNumber) {
  // Update the realtime attempt display
  const realtimeDiv = document.getElementById('realtime-attempt');
  if (realtimeDiv) {
    realtimeDiv.innerHTML = `<strong>Mencoba: Percobaan ${attemptNumber}</strong>`;
  }
  
  // Update the progress bar
  const progressBar = document.getElementById('progress-bar');
  const attemptCounter = document.getElementById('attempt-counter');
  
  // Assume max attempts is 100 for progress bar calculation
  const progressPercent = Math.min(5 + ((attemptNumber / 100) * 95), 95);
  progressBar.style.width = `${progressPercent}%`;
  
  // Update attempt counter text
  attemptCounter.textContent = `Sedang berjalan: Percobaan ke-${attemptNumber}`;
}

// Variables to track link visibility state
let isLinkVisible = false;

// Function to mask the sensitive part of Coca-Cola link
function maskCokeLink(inputElement) {
  const value = inputElement.value;
  const displayElement = document.getElementById('masked-link-display');
  
  // If link is set to visible, don't mask anything
  if (isLinkVisible) {
    displayElement.style.display = 'none';
    inputElement.style.color = '';
    return;
  }
  
  // Check if the link follows the expected pattern
  if (value && value.includes('/s/')) {
    const parts = value.split('/s/');
    const domain = parts[0] + '/s/';
    const id = parts[1];
    
    // Create a masked version where we show only the domain part
    // and replace the ID part with asterisks
    if (id) {
      // Show the real input as invisible but put a masked overlay
      displayElement.innerHTML = `${domain}<span class="font-bold text-black">${'•'.repeat(Math.min(id.length, 10))}</span>`;
      displayElement.style.display = 'flex';
      
      // Make sure we're not covering any text that's being typed
      inputElement.style.color = 'transparent';
      inputElement.style.caretColor = '#4b5563'; // Make the cursor visible
    } else {
      // If there's no ID part yet, just show the domain
      displayElement.innerHTML = domain;
      displayElement.style.display = 'flex';
      inputElement.style.color = 'transparent';
      inputElement.style.caretColor = '#4b5563';
    }
  } else {
    // If it doesn't match our pattern, show the raw input
    displayElement.style.display = 'none';
    inputElement.style.color = '';
  }
}

// Function to toggle link visibility
function toggleLinkVisibility() {
  const linkInput = document.getElementById('coca-cola-link');
  const showIcon = document.getElementById('show-link-icon');
  const hideIcon = document.getElementById('hide-link-icon');
  const maskedDisplay = document.getElementById('masked-link-display');
  
  isLinkVisible = !isLinkVisible;
  
  if (isLinkVisible) {
    // Show the actual link text
    linkInput.style.color = '';
    maskedDisplay.style.display = 'none';
    showIcon.classList.add('hidden');
    hideIcon.classList.remove('hidden');
  } else {
    // Re-mask the link
    showIcon.classList.remove('hidden');
    hideIcon.classList.add('hidden');
    maskCokeLink(linkInput);
  }
}

// Initialize UI when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('start-button');
  const linkInput = document.getElementById('coca-cola-link');
  
  // Always ensure right-clicking is enabled
  document.body.oncontextmenu = function() { return true; };
  
  // Click event for the start button
  startButton.addEventListener('click', async function() {
    try {
      const cocaColaLink = document.getElementById('coca-cola-link').value;
      const packagingCode = document.getElementById('packaging-code').value;
      
      if (!cocaColaLink || !packagingCode) {
        showToast('Silakan isi link Coca-Cola dan Kode Kemasan', 'error');
        return;
      }

      // Validate that the link is a Coca-Cola link
      if (!cocaColaLink.includes('ayo.coca-cola.co.id')) {
        showToast('Silakan masukkan link Coca-Cola yang valid', 'error');
        return;
      }
      
      // Clear any previous results first when starting a new claim
      document.getElementById('result-display').innerHTML = '<div class="text-gray-400 text-center">Memulai proses baru...</div>';
      
      // Update button state
      this.disabled = true;
      this.textContent = 'Memproses...';
      
      // Reset progress
      document.getElementById('progress-bar').style.width = '0%';
      document.getElementById('attempt-counter').textContent = 'Mengekstrak token...';
      
      // First extract the authorization token from the link
      showToast('Mendapatkan token dari link...', 'info');
      const token = await extractToken(cocaColaLink);
      
      if (!token) {
        throw new Error('Gagal mendapatkan token dari link');
      }
      
      // Then start the claim process with the extracted token
      showToast('Token berhasil diekstrak, memulai proses claim...', 'success');
      await claimCode(packagingCode, token);
      
    } catch (error) {
      console.error('Process error:', error);
      showToast(`Error: ${error.message}`, 'error');
      
      // Re-enable the start button
      this.disabled = false;
      this.textContent = 'Mulai Claim';
    }
  });
  
  // Initialize the masking for the Coca-Cola link input
  if (linkInput.value) {
    maskCokeLink(linkInput);
  }
  
  // Set up the visibility toggle
  const toggleButton = document.getElementById('toggle-link-visibility');
  toggleButton.addEventListener('click', toggleLinkVisibility);
});