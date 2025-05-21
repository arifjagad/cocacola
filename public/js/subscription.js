// Subscription management and device tracking for Coca-Cola Code Claimer

// Initialize FingerprintJS for device identification
async function initFingerprint() {
  try {
    const fpPromise = FingerprintJS.load();
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('Error initializing fingerprint:', error);
    showToast('Error initializing fingerprint. Please try again.', 'error');
    return null;
  }
}

// Check if the current access code is valid and if the device limit has been reached
async function checkSubscription() {
  try {
    // Get the access code from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const accessCode = urlParams.get('code');
    
    if (!accessCode) {
      // No access code found, redirect to the homepage
      window.location.href = '/';
      return;
    }
    
    // Get device fingerprint
    const deviceId = await initFingerprint();
    
    if (!deviceId) {
      showSubscriptionError("Tidak dapat menginisialisasi pengenal perangkat. Silakan aktifkan JavaScript dan coba lagi.");
      return;
    }
    
    // Display device ID in the footer
    document.getElementById('device-id').textContent = deviceId.substring(0, 8) + '...';
    
    // Call the API to check subscription status
    const response = await fetch('/api/check-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessCode,
        deviceId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to verify subscription');
    }
    
    const data = await response.json();
    
    if (!data.valid) {
      // Invalid subscription or access code
      showSubscriptionError(data.message || 'Langganan tidak valid atau sudah kadaluarsa');
      return;
    }
    
    // Update subscription info
    updateSubscriptionInfo(data);
    
    // Check device limit
    if (data.deviceCount > 1) {
      showDeviceLimitWarning(data.deviceCount, data.deviceLimit);
    }
    
    // If subscription is about to expire (less than 3 days), show warning
    const expiryDate = new Date(data.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 3) {
      showExpiryWarning(daysUntilExpiry);
    }
    
  } catch (error) {
    console.error('Subscription check error:', error);
    showSubscriptionError(error.message || 'Gagal memverifikasi langganan. Silakan coba lagi nanti.');
  }
}

// Update subscription info display
function updateSubscriptionInfo(data) {
  const subscriptionInfo = document.getElementById('subscription-info');
  const expiryDate = document.getElementById('expiry-date');
  
  // Format the expiry date
  const formattedDate = new Date(data.expiryDate).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Update the text
  expiryDate.textContent = `Berlaku hingga: ${formattedDate}`;
  
  // Update subscription type display
  const subscriptionType = subscriptionInfo.querySelector('.font-medium');
  subscriptionType.textContent = `${data.subscriptionType} Access`;
  
  // Change color based on subscription type
  if (data.subscriptionType === 'Basic') {
    subscriptionInfo.classList.remove('bg-green-100', 'border-green-300');
    subscriptionInfo.classList.add('bg-blue-100', 'border-blue-300');
    subscriptionType.classList.remove('text-green-800');
    subscriptionType.classList.add('text-blue-800');
    expiryDate.classList.remove('text-green-700');
    expiryDate.classList.add('text-blue-700');
  } else if (data.subscriptionType === 'Ultimate') {
    subscriptionInfo.classList.remove('bg-green-100', 'border-green-300');
    subscriptionInfo.classList.add('bg-purple-100', 'border-purple-300');
    subscriptionType.classList.remove('text-green-800');
    subscriptionType.classList.add('text-purple-800');
    expiryDate.classList.remove('text-green-700');
    expiryDate.classList.add('text-purple-700');
  }
  
  // Update device information display
  if (data.deviceInfo) {
    // Perbarui element yang menampilkan device info
    const deviceInfoEl = document.getElementById('device-info');
    if (deviceInfoEl) {
      let deviceText = '';
      
      if (data.deviceInfo.device) {
        deviceText += data.deviceInfo.device;
      }
      
      if (data.deviceInfo.os) {
        deviceText += ` (${data.deviceInfo.os})`;
      }
      
      if (data.deviceInfo.browser) {
        deviceText += ` • ${data.deviceInfo.browser}`;
      }
      
      deviceInfoEl.textContent = deviceText || 'Unknown Device';
    }
    
    // Update device count if element exists
    const deviceCountEl = document.getElementById('device-count');
    if (deviceCountEl) {
      deviceCountEl.textContent = `${data.deviceCount || 1} / ${data.deviceLimit || '-'} devices`;
    }
  }
}

// Show subscription error
function showSubscriptionError(message) {
  // Replace the entire content with an error message
  document.body.innerHTML = `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div class="text-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 class="text-2xl font-bold text-gray-800 mt-4">Error Langganan</h2>
        </div>
        <p class="text-gray-600 mb-6">${message}</p>
        <div class="text-center">
          <a href="/" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300 inline-block">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  `;
}

// Show device limit warning
function showDeviceLimitWarning(deviceCount, deviceLimit) {
  const deviceLimitWarning = document.getElementById('device-limit-warning');
  const deviceCountSpan = document.getElementById('device-count');
  
  deviceCountSpan.textContent = `${deviceCount} dari ${deviceLimit}`;
  deviceLimitWarning.classList.remove('hidden');
}

// Show expiry warning
function showExpiryWarning(daysUntilExpiry) {
  // Create the warning element
  const warningDiv = document.createElement('div');
  warningDiv.className = 'bg-yellow-100 mb-6 p-4 rounded-lg border border-yellow-300';
  
  let warningMessage = '';
  if (daysUntilExpiry <= 0) {
    warningMessage = 'Langganan Anda berakhir hari ini! Silakan perpanjang untuk menghindari gangguan.';
  } else if (daysUntilExpiry === 1) {
    warningMessage = 'Langganan Anda berakhir besok! Silakan perpanjang segera.';
  } else {
    warningMessage = `Langganan Anda berakhir dalam ${daysUntilExpiry} hari. Silakan perpanjang segera.`;
  }
  
  warningDiv.innerHTML = `
    <div class="flex">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p class="font-medium text-yellow-800">Peringatan Masa Berlaku</p>
        <p class="text-sm text-yellow-700">${warningMessage}</p>
        <a href="https://wa.me/628xxxx?text=Saya%20ingin%20memperpanjang%20langganan%20saya" class="text-yellow-800 underline text-sm font-medium mt-1 inline-block">Perpanjang Sekarang</a>
      </div>
    </div>
  `;
  
  // Insert after the subscription info div
  const subscriptionInfo = document.getElementById('subscription-info');
  subscriptionInfo.parentNode.insertBefore(warningDiv, subscriptionInfo.nextSibling);
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', checkSubscription);
