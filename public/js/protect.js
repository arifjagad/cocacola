// Script untuk melindungi halaman dari inspect element dan download

/**
 * Protection utilities for Coca-Cola Code Claimer
 * Allows right-click on all devices
 */

document.addEventListener('DOMContentLoaded', function() {
  // Deteksi perangkat mobile menggunakan user agent
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobileDevice) {
    // Untuk desktop, konfigurasikan proteksi termasuk pencegahan klik kanan
    
    // Disable selection for desktop
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    
    // Mencegah klik kanan HANYA pada desktop
    document.addEventListener('contextmenu', event => {
      event.preventDefault();
      alert('Klik kanan dinonaktifkan pada halaman ini.');
      return false;
    }, false);
    
    // Disable common keyboard shortcuts for desktops
    document.addEventListener('keydown', function(e) {
      // Check for Ctrl+S, Ctrl+U, F12, Ctrl+Shift+I
      if (
        (e.ctrlKey && e.key === 's') || 
        (e.ctrlKey && e.key === 'u') || 
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'i')
      ) {
        e.preventDefault();
        return false;
      }
    });
  } else {
    // Untuk mobile, biarkan selection text dan klik kanan berfungsi
    document.body.style.userSelect = 'text';
    document.body.style.webkitUserSelect = 'text';
    document.body.style.msUserSelect = 'text';
    document.body.style.mozUserSelect = 'text';
    
    console.log("Mobile device detected - context menu enabled");
  }
  
  // Tambahkan class untuk menandai bahwa ini adalah perangkat mobile
  if (isMobileDevice) {
    document.body.classList.add('is-mobile-device');
  }
});

// KODE YANG DIHAPUS: Mencegah klik kanan
// Kita menghapus event listener contextmenu berikut untuk mengizinkan klik kanan
/* 
document.addEventListener('contextmenu', event => {
  event.preventDefault();
  alert('Klik kanan dinonaktifkan pada halaman ini.');
}, false);
*/

// Mencegah kombinasi tombol umum untuk inspect element dan view source
document.addEventListener('keydown', (e) => {
  // Ctrl+U (View Source)
  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
    alert('Melihat sumber dinonaktifkan pada halaman ini.');
    return false;
  }
  
  // Ctrl+Shift+I atau F12 (DevTools)
  if ((e.ctrlKey && e.shiftKey && e.key === 'i') || e.key === 'F12') {
    e.preventDefault();
    alert('Inspect element dinonaktifkan pada halaman ini.');
    return false;
  }
  
  // Ctrl+Shift+C (Inspect Element)
  if (e.ctrlKey && e.shiftKey && e.key === 'c') {
    e.preventDefault();
    alert('Inspect element dinonaktifkan pada halaman ini.');
    return false;
  }
  
  // Ctrl+S (Save)
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    alert('Fungsi simpan dinonaktifkan pada halaman ini.');
    return false;
  }
  
  return true;
});

// Mencegah DevTools dengan mendeteksi ukuran jendela
const devToolsDetector = {
  isOpen: false,
  orientation: null,
  
  init() {
    this.checkDevTools();
    window.addEventListener('resize', this.checkDevTools.bind(this));
  },
  
  checkDevTools() {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!this.isOpen) {
        this.isOpen = true;
        alert('DevTools terdeteksi. Silahkan tutup DevTools untuk melanjutkan.');
        window.location.href = '/'; // Redirect ke homepage jika DevTools terbuka
      }
    } else {
      this.isOpen = false;
    }
  }
};

// Tambahkan layer efek kabur dan pesan warning saat mencoba inspect
(() => {
  // CSS untuk overlay blur dan pesan
  const style = document.createElement('style');
  style.innerHTML = `
    .devtools-detection-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      text-align: center;
      backdrop-filter: blur(10px);
    }
    .devtools-detection-overlay button {
      margin-top: 20px;
      padding: 10px 20px;
      background: #e53e3e;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
  
  // Fungsi untuk menampilkan overlay dan redirect
  function showDevToolsWarning() {
    const overlay = document.createElement('div');
    overlay.className = 'devtools-detection-overlay';
    overlay.innerHTML = `
      <h2>DevTools Terdeteksi!</h2>
      <p>Penggunaan DevTools tidak diizinkan pada aplikasi ini.</p>
      <button id="redirect-button">Kembali ke Beranda</button>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('redirect-button').addEventListener('click', () => {
      window.location.href = '/';
    });
  }
  
  // Deteksi jika DevTools terbuka
  let devToolsOpen = false;
  
  // Metode 1: Deteksi melalui console.log
  const devTools = /./;
  devTools.toString = function() {
    if (!devToolsOpen) {
      devToolsOpen = true;
      showDevToolsWarning();
    }
    return '';
  };
  
  // Cetak ke konsol sebagai jebakan
  console.debug(devTools);
  
  // Metode 2: Deteksi melalui ukuran window
  window.addEventListener('resize', function() {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        showDevToolsWarning();
      }
    }
  });
})();

// Inisialisasi detector
devToolsDetector.init();

// Pesan console untuk menyembunyikan pesan penting
console.log('%c⚠️ Stop!', 'color: red; font-size: 30px; font-weight: bold;');
console.log('%cHalaman ini dilindungi dan penggunaan DevTools dapat menimbulkan risiko keamanan.', 'font-size: 18px;');