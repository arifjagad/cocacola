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

// Function to show authorization instructions modal
function showAuthInstructionsModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('auth-instructions-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal element
  const modal = document.createElement('div');
  modal.id = 'auth-instructions-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden">
      <div class="p-4 bg-red-600 text-white flex justify-between items-center">
        <h3 class="text-lg font-bold">Ambil Token dari Network Tab</h3>
        <button class="focus:outline-none" id="close-auth-modal">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
      
      <div class="p-6">
        <div class="space-y-4">
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
            <p class="text-sm text-blue-700">
              <strong>Petunjuk:</strong> Pada halaman yang terbuka, ikuti langkah untuk mendapatkan Bearer token dari tab Network.
            </p>
          </div>
          
          <div class="mt-4">
            <div class="text-center">
              <p class="text-sm text-gray-600 mb-2">1. Tekan F12 untuk membuka DevTools</p>
              <p class="text-sm text-gray-600 mb-2">2. Buka tab Network dan cari request "userCoupons"</p>
              <p class="text-sm text-gray-600 mb-2">3. Salin token Bearer lengkap dari Headers</p>
              <p class="text-sm text-gray-600 mb-4">4. Tempelkan di field Authorization Token</p>
              
              <button class="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded" id="show-detailed-instructions">
                Lihat Petunjuk Lengkap
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to DOM
  document.body.appendChild(modal);
  
  // Handle close button click
  document.getElementById('close-auth-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  // Show detailed instructions
  document.getElementById('show-detailed-instructions').addEventListener('click', () => {
    modal.remove();
    showDetailedInstructionsModal();
  });
}

// Function to show detailed instructions modal
function showDetailedInstructionsModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('detailed-instructions-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal element
  const modal = document.createElement('div');
  modal.id = 'detailed-instructions-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full mx-4 overflow-hidden">
      <div class="p-4 bg-red-600 text-white flex justify-between items-center">
        <h3 class="text-lg font-bold">Cara Mendapatkan Authorization Token</h3>
        <button class="focus:outline-none" id="close-detailed-modal">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
      
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <div class="space-y-4">
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p class="text-sm text-yellow-700">
              <strong>Ikuti langkah berikut untuk mendapatkan token di tab yang baru terbuka:</strong>
            </p>
          </div>
          
          <ol class="list-decimal pl-5 space-y-4">
            <li class="font-medium">
              Link yang dibuka akan di-redirect ke halaman <code class="px-1 bg-gray-100 rounded">https://ayo.coca-cola.co.id/c/tccc-coke-utc-2025-main</code>
            </li>
            
            <li class="font-medium">
              Buka DevTools dengan tekan F12 atau klik kanan -> Inspect
              <img src="https://i.imgur.com/T6PRwCs.png" alt="Open DevTools" class="mt-2 rounded border border-gray-300">
            </li>
            
            <li class="font-medium">
              Klik tab Network (Jaringan)
              <img src="https://i.imgur.com/yNC8QiC.png" alt="Network Tab" class="mt-2 rounded border border-gray-300">
            </li>
            
            <li class="font-medium">
              Cari request dengan nama <code class="px-1 bg-gray-100 rounded">userCoupons</code> dan klik
              <img src="https://i.imgur.com/wLfeShx.jpg" alt="Find userCoupons" class="mt-2 rounded border border-gray-300">
            </li>
            
            <li class="font-medium">
              Di panel kanan, klik tab Headers, dan cari bagian Request Headers
              <div class="mt-2 mb-4 bg-gray-50 border border-gray-200 rounded-md p-4">
                <p class="font-mono text-xs text-gray-800 mb-1">Authorization: <span class="text-blue-600">Bearer eyJhbGci...</span></p>
              </div>
            </li>
            
            <li class="font-medium">
              Copy seluruh nilai token (termasuk kata "Bearer " di awal)
            </li>
            
            <li class="font-medium">
              Paste token tersebut di field Authorization Token setelah kembali ke halaman ini
            </li>
          </ol>
          
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
            <p class="text-sm text-blue-700">
              <strong>Catatan:</strong> Halaman akan otomatis redirect ke halaman campaign setelah Anda mengklik link. 
              Pastikan untuk melihat di Network tab untuk request <code class="px-1 bg-gray-100 rounded">userCoupons</code> seperti yang ditunjukkan pada gambar.
            </p>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-100 px-6 py-4 flex justify-end">
        <button class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded" id="ok-button">
          Saya Mengerti
        </button>
      </div>
    </div>
  `;
  
  // Add modal to DOM
  document.body.appendChild(modal);
  
  // Handle close button click
  document.getElementById('close-detailed-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  // Handle OK button click
  document.getElementById('ok-button').addEventListener('click', () => {
    modal.remove();
  });
}

// Function to handle the shared link
async function getAuthFromSharedLink(sharedLink) {
  try {
    // Extract the code from the shared link
    if (!sharedLink.includes('ayo.coca-cola.co.id/s/')) {
      showToast('Invalid shared link format', 'error');
      return null;
    }
    
    // Show loading toast
    showToast('Mengambil token otomatis, harap tunggu...', 'info');
    
    // Call our server API to extract the bearer token
    const response = await fetch('/api/extract-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sharedLink })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success && result.token) {
      // Successfully got the token
      showToast('Token berhasil diperoleh!', 'success');
      return result.token;
    } else {
      // Failed to get token, show manual instructions
      showToast('Gagal mengambil token otomatis. Ikuti petunjuk manual.', 'error');
      
      // Open the shared link in a new tab
      window.open(sharedLink, '_blank');
      
      // Show instructions modal
      showAuthInstructionsModal();
      
      return null;
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
    console.error('Error:', error);
    
    // Fallback to manual method
    window.open(sharedLink, '_blank');
    showAuthInstructionsModal();
    
    return null;
  }
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
  const sharedLinkInput = document.getElementById('shared-link-input');
  const getAuthButton = document.getElementById('get-auth-button');
  
  // Event listener for the "Get Authorization" button
  if (getAuthButton) {
    getAuthButton.addEventListener('click', async function() {
      const sharedLink = sharedLinkInput.value.trim();
      
      if (!sharedLink) {
        showToast('Please enter a shared link', 'error');
        return;
      }
      
      // Disable button while processing
      this.disabled = true;
      this.textContent = 'Processing...';
      
      // Get authorization from shared link
      const auth = await getAuthFromSharedLink(sharedLink);
      
      // Enable button again
      this.disabled = false;
      this.textContent = 'Get Authorization';
      
      // If we got a valid authorization, populate the field
      if (auth) {
        document.getElementById('authorization').value = auth;
        showToast('Authorization field has been populated, now enter the Packaging Code', 'success');
      }
    });
  }
  
  // Event listener for the start button
  startButton.addEventListener('click', function() {
    const packagingCode = document.getElementById('packaging-code').value;
    const authorization = document.getElementById('authorization').value;
    
    if (!packagingCode || !authorization) {
      // Show toast for missing fields
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
