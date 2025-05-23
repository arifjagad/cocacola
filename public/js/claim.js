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

// Function to claim a single code via API
async function claimCode(packagingCode, authorization, codeIndex = 0, totalCodes = 1) {
  try {
    // Get DOM elements for updating UI
    const resultDisplay = document.getElementById('result-display');
    const attemptCounter = document.getElementById('attempt-counter');
    const progressBar = document.getElementById('progress-bar');
    
    // Update batch progress if we have multiple codes
    if (totalCodes > 1) {
      document.getElementById('batch-progress').classList.remove('hidden');
      document.getElementById('current-code-number').textContent = codeIndex + 1;
      document.getElementById('total-codes-number').textContent = totalCodes;
    }
    
    // Update the corresponding code badge if we can find it
    const codeElements = document.querySelectorAll('.packaging-code');
    if (codeElements[codeIndex]) {
      const badgeElement = codeElements[codeIndex].nextElementSibling;
      badgeElement.textContent = "Sedang Diproses";
      badgeElement.className = "ml-2 code-badge badge-processing";
    }
    
    // Update UI to show we're starting with this specific code
    attemptCounter.textContent = `Memproses kode ${codeIndex + 1}/${totalCodes}: ${packagingCode}`;
    
    // Create a realtime attempt status display that will be updated
    const realtimeStatusDiv = document.createElement('div');
    realtimeStatusDiv.id = `realtime-status-${codeIndex}`;
    realtimeStatusDiv.className = 'p-2 mb-2 bg-blue-100 text-blue-800 rounded';
    realtimeStatusDiv.innerHTML = `<span class="font-medium">Kode ${codeIndex + 1}: ${packagingCode} - Sedang memproses...</span>`;
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
          realtimeStatusDiv.innerHTML = `<span class="font-medium">Kode ${codeIndex + 1}: ${packagingCode} - Percobaan ke-${attemptNum}/10</span>`;
          
          // Update the progress counter
          attemptCounter.textContent = `Kode ${codeIndex + 1}/${totalCodes}: ${packagingCode} - Percobaan ke-${attemptNum}/10`;
          
          // Calculate progress based on max 10 attempts
          const attemptProgress = Math.min(10 + (attemptNum / 10) * 70, 85);
          progressBar.style.width = `${attemptProgress}%`;
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
    if (document.getElementById(`realtime-status-${codeIndex}`)) {
      document.getElementById(`realtime-status-${codeIndex}`).remove();
    }
    
    // Remove pulsing animation from progress bar
    progressBar.classList.remove('animate-pulse');
    
    // Update progress bar based on result
    const progressPercent = result.success ? 
      ((codeIndex + 1) / totalCodes) * 100 : 
      ((codeIndex) / totalCodes) * 100 + (1 / totalCodes) * 30;
    progressBar.style.width = `${progressPercent}%`;
    
    // Create result entry
    const logEntry = document.createElement('div');
    
    // Update the corresponding code badge if we can find it
    if (codeElements[codeIndex]) {
      const badgeElement = codeElements[codeIndex].nextElementSibling;
      
      if (result.success) {
        badgeElement.textContent = "Berhasil";
        badgeElement.className = "ml-2 code-badge badge-success";
      } else {
        badgeElement.textContent = "Gagal";
        badgeElement.className = "ml-2 code-badge badge-failed";
      }
    }
    
    if (result.success) {
      // Success case - Get custom message based on response data
      const successMessage = getSuccessMessage(result.result);
      
      logEntry.className = 'p-2 mb-2 bg-green-100 text-green-800 rounded';
      logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ${successMessage}</strong><br><span class="text-xs">(${result.attempts} percobaan)</span><br><details class="mt-1"><summary class="cursor-pointer text-xs">Lihat Detail</summary><pre class="mt-1 text-xs overflow-auto">${JSON.stringify(result.result, null, 2)}</pre></details>`;
      
      if (codeIndex === totalCodes - 1 || totalCodes === 1) {
        // Only show toast for single code or the last code in batch
        showToast(successMessage, 'success');
      }
    } else {
      // Error case
      switch (result.status) {
        case 'LIMIT_REACHED':
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
          logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ⚠️ ${result.message}</strong>`;
          if (codeIndex === totalCodes - 1 || totalCodes === 1) {
            showToast(result.message, 'error');
          }
          break;
        case 'INVALID_CODE':
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
          logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ❌ ${result.message}</strong>`;
          if (codeIndex === totalCodes - 1 || totalCodes === 1) {
            showToast(result.message, 'error');
          }
          break;
        case 'MAX_ATTEMPTS':
          logEntry.className = 'p-2 mb-2 bg-yellow-100 text-yellow-800 rounded';
          logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ⚠️ ${result.message}</strong><br><span class="text-xs">(${result.attempts} percobaan)</span>`;
          if (codeIndex === totalCodes - 1 || totalCodes === 1) {
            showToast(result.message, 'error');
          }
          break;
        default:
          logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
          logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - Error:</strong><br><details class="mt-1"><summary class="cursor-pointer text-xs">Lihat Detail</summary><pre class="mt-1 text-xs overflow-auto">${JSON.stringify(result, null, 2)}</pre></details>`;
          if (codeIndex === totalCodes - 1 || totalCodes === 1) {
            showToast('Terjadi kesalahan saat memproses permintaan', 'error');
          }
      }
    }
    
    // Add the result to the display
    resultDisplay.prepend(logEntry);
    
    return result;
  } catch (error) {
    console.error('Error claiming code:', error);
    
    // Show error in the result display
    const resultDisplay = document.getElementById('result-display');
    const logEntry = document.createElement('div');
    logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
    logEntry.textContent = `Error pada kode ${codeIndex + 1}: ${error.message}`;
    resultDisplay.prepend(logEntry);
    
    // Update badge if possible
    const codeElements = document.querySelectorAll('.packaging-code');
    if (codeElements[codeIndex]) {
      const badgeElement = codeElements[codeIndex].nextElementSibling;
      badgeElement.textContent = "Error";
      badgeElement.className = "ml-2 code-badge badge-failed";
    }
    
    // Update toast
    if (codeIndex === totalCodes - 1 || totalCodes === 1) {
      showToast(`Error: ${error.message}`, 'error');
    }
    
    return null;
  }
}

// New function to process multiple codes sequentially
async function processMultipleCodes(codes, token) {
  const totalCodes = codes.length;
  const progressBar = document.getElementById('progress-bar');
  const attemptCounter = document.getElementById('attempt-counter');
  
  // Set initial progress
  progressBar.style.width = '0%';
  attemptCounter.textContent = `Mempersiapkan ${totalCodes} kode...`;
  
  // Process each code sequentially
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i].trim();
    if (code) {
      await claimCode(code, token, i, totalCodes);
    }
  }
  
  // Final progress update
  progressBar.style.width = '100%';
  attemptCounter.textContent = `Selesai memproses ${totalCodes} kode`;
  
  // Hide batch progress indicator
  document.getElementById('batch-progress').classList.add('hidden');
  
  // Re-enable the start button
  document.getElementById('start-button').disabled = false;
  document.getElementById('start-button').textContent = 'Mulai Claim';
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
  
  // Calculate progress based on max 10 attempts
  const progressPercent = Math.min(5 + ((attemptNumber / 10) * 85), 95);
  progressBar.style.width = `${progressPercent}%`;
  
  // Update attempt counter text
  attemptCounter.textContent = `Sedang berjalan: Percobaan ke-${attemptNumber}/10`;
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
  const addCodeButton = document.getElementById('add-code-button');
  
  // Always ensure right-clicking is enabled on mobile
  if (isMobileDevice) {
    document.body.oncontextmenu = function() { return true; };
  }
  
  // Click event for the add code button
  addCodeButton.addEventListener('click', function() {
    const codeContainer = document.getElementById('packaging-codes-container');
    const codeInputs = codeContainer.querySelectorAll('.packaging-code');
    
    // Limit to maximum 3 codes
    if (codeInputs.length < 3) {
      // Create a new code input field with badge
      const codeInputWrapper = document.createElement('div');
      codeInputWrapper.className = 'flex items-center';
      
      const codeInput = document.createElement('input');
      codeInput.type = 'text';
      codeInput.className = 'packaging-code w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500';
      codeInput.placeholder = 'Masukkan kode tambahan';
      
      const badge = document.createElement('span');
      badge.className = 'ml-2 code-badge badge-waiting';
      badge.textContent = 'Menunggu';
      
      // Remove button
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ml-2 text-red-500 hover:text-red-700 focus:outline-none';
      removeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      `;
      
      removeButton.addEventListener('click', function() {
        codeInputWrapper.remove();
        // Show the add button again if we're under the limit
        if (codeContainer.querySelectorAll('.packaging-code').length < 3) {
          addCodeButton.style.display = '';
        }
      });
      
      // Add everything to the container
      codeInputWrapper.appendChild(codeInput);
      codeInputWrapper.appendChild(badge);
      codeInputWrapper.appendChild(removeButton);
      
      // Insert before the "Add code" button container
      codeContainer.insertBefore(codeInputWrapper, addCodeButton.parentElement);
      
      // Hide the add button if we've reached the limit
      if (codeContainer.querySelectorAll('.packaging-code').length >= 3) {
        addCodeButton.style.display = 'none';
      }
    }
  });
  
  // Click event for the start button
  startButton.addEventListener('click', async function() {
    try {
      const cocaColaLink = document.getElementById('coca-cola-link').value;
      const codeInputs = document.querySelectorAll('.packaging-code');
      
      // Collect all codes
      const packagingCodes = [];
      for (const input of codeInputs) {
        const code = input.value.trim();
        if (code) {
          packagingCodes.push(code);
        }
      }
      
      if (!cocaColaLink || packagingCodes.length === 0) {
        showToast('Silakan isi link Coca-Cola dan minimal 1 Kode Kemasan', 'error');
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
      showToast(`Token berhasil diekstrak, memulai proses claim ${packagingCodes.length} kode...`, 'success');
      await processMultipleCodes(packagingCodes, token);
      
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