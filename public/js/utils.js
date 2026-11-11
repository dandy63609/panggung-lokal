/**
 * Panggung Lokal - Client Utilities
 */

/**
 * Format number into Indonesian Rupiah format (e.g. Rp 3.500.000)
 * Requirements: 8.3
 */
function formatRupiah(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Dapat dinegosiasikan';
  }
  const num = Math.round(Number(amount));
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format date string into Indonesian readable format (e.g. 20 Okt 2026)
 * Requirements: 8.4
 */
function formatIndonesianDate(dateStr) {
  if (!dateStr) return '-';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Display toast message to user
 */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Make functions accessible globally
window.formatRupiah = formatRupiah;
window.formatIndonesianDate = formatIndonesianDate;
window.showToast = showToast;
