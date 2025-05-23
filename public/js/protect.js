// Script untuk melindungi halaman dari inspect element dan download

/**
 * Protection utilities for Coca-Cola Code Claimer
 * Allows right-click on mobile devices but disables it on desktop
 */

document.addEventListener('DOMContentLoaded', function() {
  // Deteksi perangkat mobile menggunakan user agent
  window.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Deteksi iOS secara spesifik
  window.isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (!isMobileDevice) {
    // Hanya terapkan proteksi lebih lanjut pada perangkat desktop
    
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
    // Untuk mobile, biarkan selection text berfungsi
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
  
  if (isIOSDevice) {
    document.body.classList.add('is-ios-device');
    console.log("iOS device detected - bypassing DevTools detection");
  }
});

// Mencegah kombinasi tombol umum untuk inspect element dan view source
// Kecuali untuk perangkat iOS yang mengalami false positives
document.addEventListener('keydown', (e) => {
  // Skip untuk perangkat iOS
  if (window.isIOSDevice) return true;
  
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

// PENTING: Hapus deteksi DevTools ukuran jendela yang sudah ada yang menyebabkan false positives di iOS
// dan ganti dengan versi yang lebih cerdas yang memeriksa apakah ini adalah iOS terlebih dahulu

// Pesan console untuk menyembunyikan pesan penting
console.log('%c⚠️ Stop!', 'color: red; font-size: 30px; font-weight: bold;');
console.log('%cHalaman ini dilindungi dan penggunaan DevTools dapat menimbulkan risiko keamanan.', 'font-size: 18px;');

// Load script deteksi DevTools yang lebih baik yang tidak mengganggu perangkat iOS
document.addEventListener('DOMContentLoaded', function() {
  // Hanya muat script deteksi DevTools jika bukan perangkat iOS
  if (!window.isIOSDevice) {
    const script = document.createElement('script');
    script.src = '/js/devtools-detection.js';
    document.head.appendChild(script);
  }
});