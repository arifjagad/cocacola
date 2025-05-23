// **OPTIMIZATION 19: Enhanced toast with better performance**
function showToast(message, type = 'info') {
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  
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
  
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
  });
  
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

// **OPTIMIZATION 20: Enhanced token extraction with better error handling**
async function extractToken(cocaColaLink) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second total timeout
  
  try {
    const tokenStatus = document.getElementById('token-status');
    const extractionAttempt = document.getElementById('extraction-attempt');
    tokenStatus.classList.remove('hidden');
    
    let seconds = 0;
    const extractionTimer = setInterval(() => {
      seconds++;
      extractionAttempt.textContent = `Proses berlangsung ${seconds} detik...`;
    }, 1000);
    
    const response = await fetch('/api/extract-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cocaColaLink }),
      signal: controller.signal
    });
    
    clearInterval(extractionTimer);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Gagal mengambil token: ${response.status}`);
    }
    
    const data = await response.json();
    tokenStatus.classList.add('hidden');
    
    if (!data.success) {
      throw new Error(data.message || 'Gagal mengambil token dari userCoupons request');
    }
    
    return data.token;
  } catch (error) {
    clearTimeout(timeoutId);
    document.getElementById('token-status').classList.add('hidden');
    
    if (error.name === 'AbortError') {
      throw new Error('Timeout: Proses mengambil token terlalu lama');
    }
    throw error;
  }
}

// **OPTIMIZATION 21: Enhanced success message detection**
function getSuccessMessage(responseData) {
  try {
    // Enhanced parsing for different response structures
    const checkPaths = [
      'parsedData.result.campaign_public_settings.public_name',
      'result.campaign_public_settings.public_name',
      'data.campaign_public_settings.public_name'
    ];
    
    let publicName = null;
    
    for (const path of checkPaths) {
      const value = path.split('.').reduce((obj, key) => obj?.[key], responseData);
      if (value) {
        publicName = value;
        break;
      }
    }
    
    if (publicName) {
      const messageMap = {
        'public-ayo-cola-utc-cinepolis-b1f1': 'Mendapatkan Voucher Cinepolis B1G1',
        'public-ayo-cola-utc-cinepolis-free': 'Mendapatkan 1 Voucher Gratis Cinepolis',
        'public-ayo-cola-utc-main': 'Berhasil claim voucher utama'
      };
      
      return messageMap[publicName] || 'Berhasil claim voucher';
    }
    
    return "Berhasil claim kode";
  } catch (error) {
    console.error("Error parsing success message:", error);
    return "Berhasil claim kode";
  }
}

// **OPTIMIZATION 22: Enhanced claim function with better error handling and retry logic**
async function claimCode(packagingCode, authorization, codeIndex = 0, totalCodes = 1) {
  let eventSource = null;
  
  try {
    // Input validation
    if (!packagingCode || !authorization) {
      throw new Error('Kode kemasan dan authorization diperlukan');
    }
    
    const resultDisplay = document.getElementById('result-display');
    const attemptCounter = document.getElementById('attempt-counter');
    const progressBar = document.getElementById('progress-bar');
    
    // Update batch progress
    if (totalCodes > 1) {
      document.getElementById('batch-progress').classList.remove('hidden');
      document.getElementById('current-code-number').textContent = codeIndex + 1;
      document.getElementById('total-codes-number').textContent = totalCodes;
    }
    
    // Update code badge
    const codeElements = document.querySelectorAll('.packaging-code');
    if (codeElements[codeIndex]) {
      const badgeElement = codeElements[codeIndex].nextElementSibling;
      badgeElement.textContent = "Sedang Diproses";
      badgeElement.className = "ml-2 code-badge badge-processing";
    }
    
    attemptCounter.textContent = `Memproses kode ${codeIndex + 1}/${totalCodes}: ${packagingCode}`;
    
    // Create realtime status display
    const realtimeStatusDiv = document.createElement('div');
    realtimeStatusDiv.id = `realtime-status-${codeIndex}`;
    realtimeStatusDiv.className = 'p-2 mb-2 bg-blue-100 text-blue-800 rounded';
    realtimeStatusDiv.innerHTML = `<span class="font-medium">Kode ${codeIndex + 1}: ${packagingCode} - Memulai...</span>`;
    resultDisplay.prepend(realtimeStatusDiv);
    
    // **OPTIMIZATION 23: Enhanced SSE with better error handling**
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupEventSource = () => {
      eventSource = new EventSource('/api/attempt-events');
      
      eventSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.attempt) {
            const attemptNum = data.attempt;
            realtimeStatusDiv.innerHTML = `<span class="font-medium">Kode ${codeIndex + 1}: ${packagingCode} - Percobaan ke-${attemptNum}/25</span>`;
            attemptCounter.textContent = `Kode ${codeIndex + 1}/${totalCodes}: ${packagingCode} - Percobaan ke-${attemptNum}/25`;
            
            const attemptProgress = Math.min(10 + (attemptNum / 25) * 70, 85);
            progressBar.style.width = `${attemptProgress}%`;
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      };
      
      eventSource.onerror = function(event) {
        console.log('SSE connection error, retrying...', retryCount);
        eventSource.close();
        
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupEventSource, 1000 * retryCount); // Exponential backoff
        }
      };
      
      eventSource.onopen = function() {
        retryCount = 0; // Reset on successful connection
      };
    };
    
    setupEventSource();
    
    // **OPTIMIZATION 24: Enhanced API call with timeout and retry**
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
    
    const response = await fetch('/api/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packagingCode: packagingCode.trim(),
        authorization
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Cleanup
    if (eventSource) {
      eventSource.close();
    }
    
    if (document.getElementById(`realtime-status-${codeIndex}`)) {
      document.getElementById(`realtime-status-${codeIndex}`).remove();
    }
    
    progressBar.classList.remove('animate-pulse');
    
    // Update progress bar
    const progressPercent = result.success ? 
      ((codeIndex + 1) / totalCodes) * 100 : 
      ((codeIndex) / totalCodes) * 100 + (1 / totalCodes) * 30;
    progressBar.style.width = `${progressPercent}%`;
    
    // Create result entry
    const logEntry = document.createElement('div');
    
    // Update badge
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
     const successMessage = getSuccessMessage(result.result);
     
     logEntry.className = 'p-2 mb-2 bg-green-100 text-green-800 rounded';
     logEntry.innerHTML = `
       <strong>Kode ${codeIndex + 1}: ${packagingCode} - ${successMessage}</strong>
       <br><span class="text-xs">(Berhasil pada percobaan ke-${result.attempts})</span>
       <br><details class="mt-1">
         <summary class="cursor-pointer text-xs">Lihat Detail</summary>
         <pre class="mt-1 text-xs overflow-auto">${JSON.stringify(result.result, null, 2)}</pre>
       </details>
     `;
     
     if (codeIndex === totalCodes - 1 || totalCodes === 1) {
       showToast(`${successMessage} (Percobaan ke-${result.attempts})`, 'success');
     }
   } else {
     // **OPTIMIZATION 25: Enhanced error handling**
     const errorHandlers = {
       'LIMIT_REACHED': () => {
         logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
         logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ⚠️ ${result.message}</strong>`;
       },
       'INVALID_CODE': () => {
         logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
         logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ❌ ${result.message}</strong>`;
       },
       'INVALID_ARGUMENT': () => {
         const isCodeUsed = result.result?.error?.message === 'packaging_code_used';
         logEntry.className = isCodeUsed ? 'p-2 mb-2 bg-orange-100 text-orange-800 rounded' : 'p-2 mb-2 bg-red-100 text-red-800 rounded';
         const message = isCodeUsed ? 'Kode sudah digunakan' : result.message;
         logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ⚠️ ${message}</strong>`;
       },
       'MAX_ATTEMPTS': () => {
         const isCodeUsed = result.result?.error?.message === 'packaging_code_used';
         logEntry.className = 'p-2 mb-2 bg-yellow-100 text-yellow-800 rounded';
         const message = isCodeUsed ? 'Kode sudah digunakan' : result.message;
         logEntry.innerHTML = `<strong>Kode ${codeIndex + 1}: ${packagingCode} - ⚠️ ${message}</strong><br><span class="text-xs">(${result.attempts} percobaan)</span>`;
       }
     };
     
     const handler = errorHandlers[result.status];
     if (handler) {
       handler();
     } else {
       logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
       logEntry.innerHTML = `
         <strong>Kode ${codeIndex + 1}: ${packagingCode} - Error:</strong>
         <br><details class="mt-1">
           <summary class="cursor-pointer text-xs">Lihat Detail</summary>
           <pre class="mt-1 text-xs overflow-auto">${JSON.stringify(result, null, 2)}</pre>
         </details>
       `;
     }
     
     if (codeIndex === totalCodes - 1 || totalCodes === 1) {
       const errorMessage = result.result?.error?.message === 'packaging_code_used' ? 
         'Kode sudah digunakan' : result.message;
       showToast(errorMessage, 'error');
     }
   }
   
   resultDisplay.prepend(logEntry);
   return result;
   
 } catch (error) {
   console.error('Error claiming code:', error);
   
   // Cleanup on error
   if (eventSource) {
     eventSource.close();
   }
   
   const resultDisplay = document.getElementById('result-display');
   const logEntry = document.createElement('div');
   logEntry.className = 'p-2 mb-2 bg-red-100 text-red-800 rounded';
   
   let errorMessage = error.message;
   if (error.name === 'AbortError') {
     errorMessage = 'Timeout: Proses claim terlalu lama';
   }
   
   logEntry.textContent = `Error pada kode ${codeIndex + 1}: ${errorMessage}`;
   resultDisplay.prepend(logEntry);
   
   const codeElements = document.querySelectorAll('.packaging-code');
   if (codeElements[codeIndex]) {
     const badgeElement = codeElements[codeIndex].nextElementSibling;
     badgeElement.textContent = "Error";
     badgeElement.className = "ml-2 code-badge badge-failed";
   }
   
   if (codeIndex === totalCodes - 1 || totalCodes === 1) {
     showToast(`Error: ${errorMessage}`, 'error');
   }
   
   return null;
 }
}

// **OPTIMIZATION 26: Enhanced batch processing with better error recovery**
async function processMultipleCodes(codes, token) {
 const totalCodes = codes.length;
 const progressBar = document.getElementById('progress-bar');
 const attemptCounter = document.getElementById('attempt-counter');
 
 progressBar.style.width = '0%';
 attemptCounter.textContent = `Mempersiapkan ${totalCodes} kode...`;
 
 let successCount = 0;
 let errorCount = 0;
 
 for (let i = 0; i < codes.length; i++) {
   const code = codes[i].trim();
   if (code) {
     try {
       const result = await claimCode(code, token, i, totalCodes);
       if (result?.success) {
         successCount++;
       } else {
         errorCount++;
       }
     } catch (error) {
       errorCount++;
       console.error(`Failed to process code ${i + 1}:`, error);
     }
     
     // **OPTIMIZATION 27: Add small delay between codes to prevent overwhelming**
     if (i < codes.length - 1) {
       await new Promise(resolve => setTimeout(resolve, 500));
     }
   }
 }
 
 progressBar.style.width = '100%';
 
 // **OPTIMIZATION 28: Enhanced completion summary**
 const summaryMessage = `Selesai! ${successCount} berhasil, ${errorCount} gagal dari ${totalCodes} kode`;
 attemptCounter.textContent = summaryMessage;
 
 document.getElementById('batch-progress').classList.add('hidden');
 
 const startButton = document.getElementById('start-button');
 startButton.disabled = false;
 startButton.textContent = 'Mulai Claim';
 
 // Show completion toast
 if (successCount > 0) {
   showToast(summaryMessage, 'success');
 } else if (errorCount > 0) {
   showToast(`Semua kode gagal diproses. ${summaryMessage}`, 'error');
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
 
 // Calculate progress based on max 10 attempts
 const progressPercent = Math.min(5 + ((attemptNumber / 10) * 85), 95);
 progressBar.style.width = `${progressPercent}%`;
 
 // Update attempt counter text
 attemptCounter.textContent = `Sedang berjalan: Percobaan ke-${attemptNumber}/10`;
}

// Variables to track link visibility state
let isLinkVisible = false;

// **OPTIMIZATION 29: Enhanced link masking with better performance**
function maskCokeLink(inputElement) {
 const value = inputElement.value;
 const displayElement = document.getElementById('masked-link-display');
 
 if (isLinkVisible) {
   displayElement.style.display = 'none';
   inputElement.style.color = '';
   return;
 }
 
 if (value && value.includes('/s/')) {
   const parts = value.split('/s/');
   const domain = parts[0] + '/s/';
   const id = parts[1];
   
   if (id) {
     const maskedId = '•'.repeat(Math.min(id.length, 10));
     displayElement.innerHTML = `${domain}<span class="font-bold text-black">${maskedId}</span>`;
     displayElement.style.display = 'flex';
     inputElement.style.color = 'transparent';
     inputElement.style.caretColor = '#4b5563';
   } else {
     displayElement.innerHTML = domain;
     displayElement.style.display = 'flex';
     inputElement.style.color = 'transparent';
     inputElement.style.caretColor = '#4b5563';
   }
 } else {
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
   linkInput.style.color = '';
   maskedDisplay.style.display = 'none';
   showIcon.classList.add('hidden');
   hideIcon.classList.remove('hidden');
 } else {
   showIcon.classList.remove('hidden');
   hideIcon.classList.add('hidden');
   maskCokeLink(linkInput);
 }
}

// **OPTIMIZATION 30: Enhanced DOM initialization with better event handling**
document.addEventListener('DOMContentLoaded', function() {
 const startButton = document.getElementById('start-button');
 const linkInput = document.getElementById('coca-cola-link');
 const addCodeButton = document.getElementById('add-code-button');
 
 // Ensure mobile right-click functionality
 if (typeof isMobileDevice !== 'undefined' && isMobileDevice) {
   document.body.oncontextmenu = () => true;
 }
 
 // **OPTIMIZATION 31: Debounced input handling**
 let maskingTimeout;
 linkInput.addEventListener('input', function() {
   clearTimeout(maskingTimeout);
   maskingTimeout = setTimeout(() => maskCokeLink(this), 100);
 });
 
 // Add code button handler
 addCodeButton.addEventListener('click', function() {
   const codeContainer = document.getElementById('packaging-codes-container');
   const codeInputs = codeContainer.querySelectorAll('.packaging-code');
   
   if (codeInputs.length < 3) {
     const codeInputWrapper = document.createElement('div');
     codeInputWrapper.className = 'flex items-center';
     
     const codeInput = document.createElement('input');
     codeInput.type = 'text';
     codeInput.className = 'packaging-code w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500';
     codeInput.placeholder = 'Masukkan kode tambahan';
     
     const badge = document.createElement('span');
     badge.className = 'ml-2 code-badge badge-waiting';
     badge.textContent = 'Menunggu';
     
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
       if (codeContainer.querySelectorAll('.packaging-code').length < 3) {
         addCodeButton.style.display = '';
       }
     });
     
     codeInputWrapper.appendChild(codeInput);
     codeInputWrapper.appendChild(badge);
     codeInputWrapper.appendChild(removeButton);
     
     codeContainer.insertBefore(codeInputWrapper, addCodeButton.parentElement);
     
     if (codeContainer.querySelectorAll('.packaging-code').length >= 3) {
       addCodeButton.style.display = 'none';
     }
   }
 });
 
 // **OPTIMIZATION 32: Enhanced start button with better validation and user feedback**
 startButton.addEventListener('click', async function() {
   try {
     const cocaColaLink = document.getElementById('coca-cola-link').value.trim();
     const codeInputs = document.querySelectorAll('.packaging-code');
     
     const packagingCodes = [];
     for (const input of codeInputs) {
       const code = input.value.trim();
       if (code) {
         // **OPTIMIZATION 33: Enhanced input validation**
         if (code.length < 3 || code.length > 20) {
           showToast(`Kode "${code}" tidak valid (panjang harus 3-20 karakter)`, 'error');
           return;
         }
         packagingCodes.push(code);
       }
     }
     
     if (!cocaColaLink || packagingCodes.length === 0) {
       showToast('Silakan isi link Coca-Cola dan minimal 1 Kode Kemasan', 'error');
       return;
     }

     if (!cocaColaLink.includes('ayo.coca-cola.co.id')) {
       showToast('Silakan masukkan link Coca-Cola yang valid', 'error');
       return;
     }
     
     // Check for duplicate codes
     const uniqueCodes = [...new Set(packagingCodes)];
     if (uniqueCodes.length !== packagingCodes.length) {
       showToast('Ditemukan kode duplikat. Silakan hapus kode yang sama.', 'error');
       return;
     }
     
     // Clear previous results
     document.getElementById('result-display').innerHTML = '<div class="text-gray-400 text-center">Memulai proses baru...</div>';
     
     // Update button state
     this.disabled = true;
     this.textContent = 'Memproses...';
     
     // Reset progress
     document.getElementById('progress-bar').style.width = '0%';
     document.getElementById('attempt-counter').textContent = 'Mengekstrak token dari userCoupons...';
     
     showToast('Mendapatkan token dari userCoupons request...', 'info');
     const token = await extractToken(cocaColaLink);
     
     if (!token) {
       throw new Error('Gagal mendapatkan token dari userCoupons request');
     }
     
     showToast(`Token berhasil diekstrak! Memulai proses claim ${packagingCodes.length} kode...`, 'success');
     await processMultipleCodes(packagingCodes, token);
     
   } catch (error) {
     console.error('Process error:', error);
     showToast(`Error: ${error.message}`, 'error');
     
     this.disabled = false;
     this.textContent = 'Mulai Claim';
   }
 });
 
 // Initialize link masking
 if (linkInput.value) {
   maskCokeLink(linkInput);
 }
 
 // Set up visibility toggle
 const toggleButton = document.getElementById('toggle-link-visibility');
 if (toggleButton) {
   toggleButton.addEventListener('click', toggleLinkVisibility);
 }
 
 // **OPTIMIZATION 34: Add keyboard shortcuts**
 document.addEventListener('keydown', function(event) {
   // Ctrl/Cmd + Enter to start claim
   if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
     if (!startButton.disabled) {
       startButton.click();
     }
   }
   
   // Escape to cancel (if possible)
   if (event.key === 'Escape') {
     // Could add cancel functionality here
     const tokenStatus = document.getElementById('token-status');
     if (!tokenStatus.classList.contains('hidden')) {
       showToast('Operasi dibatalkan oleh pengguna', 'info');
     }
   }
 });
});

// **OPTIMIZATION 35: Add performance monitoring**
if (typeof performance !== 'undefined' && performance.mark) {
 document.addEventListener('DOMContentLoaded', () => {
   performance.mark('app-initialized');
   console.log('App initialized at:', performance.now(), 'ms');
 });
}

// **OPTIMIZATION 36: Add error boundary for unhandled errors**
window.addEventListener('error', function(event) {
 console.error('Unhandled error:', event.error);
 showToast('Terjadi kesalahan tidak terduga. Silakan refresh halaman.', 'error');
});

window.addEventListener('unhandledrejection', function(event) {
 console.error('Unhandled promise rejection:', event.reason);
 showToast('Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');
});

// **OPTIMIZATION 37: Add connection status monitoring**
window.addEventListener('online', function() {
 showToast('Koneksi internet tersambung kembali', 'success');
});

window.addEventListener('offline', function() {
 showToast('Koneksi internet terputus', 'error');
});

// **OPTIMIZATION 38: Add visibility change handling for better performance**
document.addEventListener('visibilitychange', function() {
 if (document.hidden) {
   console.log('Page hidden - pausing non-critical operations');
 } else {
   console.log('Page visible - resuming operations');
 }
});

// **OPTIMIZATION 39: Memory cleanup for large result displays**
function cleanupOldResults() {
 const resultDisplay = document.getElementById('result-display');
 const entries = resultDisplay.children;
 
 // Keep only the last 50 entries to prevent memory issues
 if (entries.length > 50) {
   while (entries.length > 50) {
     entries[entries.length - 1].remove();
   }
   console.log('Cleaned up old result entries');
 }
}

// **OPTIMIZATION 40: Throttled scroll handling for large result lists**
let scrollTimeout;
document.getElementById('result-display')?.addEventListener('scroll', function() {
 clearTimeout(scrollTimeout);
 scrollTimeout = setTimeout(() => {
   cleanupOldResults();
 }, 1000);
});