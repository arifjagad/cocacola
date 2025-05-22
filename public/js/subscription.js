/**
 * File yang menangani cek subscription dan device limit
 */

// Generate simple device ID tanpa fingerprintjs
function generateSimpleDeviceId() {
  // Dapatkan informasi browser & OS standar yang cukup unik
  const { userAgent, language, platform } = navigator;
  const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Kombinasi data untuk mendapatkan ID sederhana yang cukup untuk menandai device
  const stringToHash = `${userAgent}|${language}|${platform}|${screenInfo}|${timeZone}`;
  
  // Buat hash sederhana
  let hash = 0;
  for (let i = 0; i < stringToHash.length; i++) {
    const char = stringToHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Konversi ke string yang lebih mudah dibaca
  return Math.abs(hash).toString(16) + Date.now().toString(36);
}

// Format tanggal ke format Indonesia (DD Bulan YYYY)
function formatDateIndonesia(dateString) {
  const date = new Date(dateString);
  
  // Array nama bulan dalam Bahasa Indonesia
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const tanggal = date.getDate();
  const namaBulan = bulan[date.getMonth()];
  const tahun = date.getFullYear();
  
  return `${tanggal} ${namaBulan} ${tahun}`;
}

// Function to check subscription status and update UI
async function checkSubscription() {
  try {
    // Get URL parameters 
    const urlParams = new URLSearchParams(window.location.search);
    const accessCode = urlParams.get('code');
    
    if (!accessCode) {
      window.location.href = '/'; // Redirect to home if no access code
      return;
    }
    
    // Get device ID from storage or generate a new one
    let deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      // Generate simple device ID
      deviceId = generateSimpleDeviceId();
      localStorage.setItem('deviceId', deviceId);
    }
    
    // Update the device ID in the UI
    document.getElementById('device-id').innerText = deviceId.substring(0, 8) + '...';
    
    // Check subscription with the API
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
      const data = await response.json();
      throw new Error(data.message || 'Failed to check subscription status');
    }
    
    const data = await response.json();
    
    if (!data.valid) {
      throw new Error(data.message || 'Invalid subscription');
    }
    
    // Update UI with subscription info berdasarkan subscription type
    const subscriptionInfo = document.getElementById('subscription-info');
    const subscriptionTitle = subscriptionInfo.querySelector('p.font-medium');
    const expiryDateElement = document.getElementById('expiry-date');
    
    if (data.subscriptionType === 'Trial') {
      // Untuk Trial, ubah warna ke biru dan tampilkan sebagai Trial Access
      subscriptionInfo.classList.remove('bg-green-100', 'border-green-300');
      subscriptionInfo.classList.add('bg-blue-100', 'border-blue-300');
      
      const icon = subscriptionInfo.querySelector('svg');
      icon.classList.remove('text-green-600');
      icon.classList.add('text-blue-600');
      
      subscriptionTitle.classList.remove('text-green-800');
      subscriptionTitle.classList.add('text-blue-800');
      subscriptionTitle.innerText = 'Trial Access';
      
      expiryDateElement.classList.remove('text-green-700');
      expiryDateElement.classList.add('text-blue-700');
    } else {
      // Untuk Premium atau tipe lain, gunakan warna hijau dan Premium Access
      subscriptionInfo.classList.remove('bg-blue-100', 'border-blue-300');
      subscriptionInfo.classList.add('bg-green-100', 'border-green-300');
      
      const icon = subscriptionInfo.querySelector('svg');
      icon.classList.remove('text-blue-600');
      icon.classList.add('text-green-600');
      
      subscriptionTitle.classList.remove('text-blue-800');
      subscriptionTitle.classList.add('text-green-800');
      subscriptionTitle.innerText = 'Premium Access';
      
      expiryDateElement.classList.remove('text-blue-700');
      expiryDateElement.classList.add('text-green-700');
    }
    
    // Update expiry date text dengan format yang lebih manusiawi
    const formattedDate = formatDateIndonesia(data.expiryDate);
    expiryDateElement.innerText = `Berlaku hingga: ${formattedDate}`;
    
    // Update device count dan device limit (selalu tampilkan)
    document.getElementById('device-count').innerText = data.deviceCount;
    document.getElementById('device-limit').innerText = data.deviceLimit;
    
    // Ubah warna jika perangkat hampir penuh
    if (data.deviceCount >= data.deviceLimit) {
      document.getElementById('device-limit-warning').classList.remove('bg-blue-100', 'border-blue-300');
      document.getElementById('device-limit-warning').classList.add('bg-yellow-100', 'border-yellow-300');
      
      const icon = document.querySelector('#device-limit-warning svg');
      icon.classList.remove('text-blue-600');
      icon.classList.add('text-yellow-600');
      
      const title = document.querySelector('#device-limit-warning p.font-medium');
      title.classList.remove('text-blue-800');
      title.classList.add('text-yellow-800');
      
      const text = document.querySelector('#device-limit-warning p.text-sm');
      text.classList.remove('text-blue-700');
      text.classList.add('text-yellow-700');
    }
    
    return data;
    
  } catch (error) {
    console.error('Subscription check error:', error);
    
    // Show access denied overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-red-900 bg-opacity-95 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="bg-white p-6 rounded-lg max-w-md w-full text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 class="text-xl font-bold text-red-600 mb-2">Akses Ditolak</h2>
        <p class="text-gray-700 mb-6">${error.message}</p>
        <a href="/" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300">
          Kembali ke Beranda
        </a>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }
}

// Call the function when document is loaded
document.addEventListener('DOMContentLoaded', checkSubscription);