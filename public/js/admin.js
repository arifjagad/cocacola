// Admin dashboard functionality for Coca-Cola Code Claimer

// Global variables
let currentPage = 1;
let pageSize = 10;
let totalSubscriptions = 0;
let currentDevicePage = 1;
let devicePageSize = 10;
let totalDevices = 0;
let subscriptions = [];
let devices = [];
let charts = {};
let editMode = false;

// Initialize admin panel on page load
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
  setupEventListeners();
});

// Check if user is already logged in
function checkAuthStatus() {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    showLoginForm();
    return;
  }
  
  // Verify token with server
  fetch('/api/admin/verify-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Invalid token');
    }
    return response.json();
  })
  .then(data => {
    if (data.valid) {
      showDashboard();
      setupDashboard();
      document.getElementById('admin-name').textContent = data.name || 'Admin';
    } else {
      showLoginForm();
    }
  })
  .catch(error => {
    console.error('Auth check error:', error);
    showLoginForm();
  });
}

// Show login form
function showLoginForm() {
  document.getElementById('login-container').classList.remove('hidden');
  document.getElementById('dashboard-container').classList.add('hidden');
}

// Show dashboard
function showDashboard() {
  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('dashboard-container').classList.remove('hidden');
}

// Set up all event listeners
function setupEventListeners() {
  // Login form submission
  document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    handleLogin();
  });
  
  // Logout button
  document.getElementById('logout-button').addEventListener('click', function() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    showLoginForm();
  });
  
  // Tab navigation
  setupTabNavigation();
  
  // Modal events
  document.getElementById('new-subscription-button').addEventListener('click', openNewSubscriptionModal);
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-subscription').addEventListener('click', closeModal);
  document.getElementById('generate-code').addEventListener('click', generateRandomCode);
  
  // Form submission
  document.getElementById('subscription-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveSubscription();
  });
  
  // Pagination
  document.getElementById('prev-page').addEventListener('click', function() {
    if (currentPage > 1) {
      currentPage--;
      loadSubscriptions();
    }
  });
  
  document.getElementById('next-page').addEventListener('click', function() {
    const maxPage = Math.ceil(totalSubscriptions / pageSize);
    if (currentPage < maxPage) {
      currentPage++;
      loadSubscriptions();
    }
  });
  
  document.getElementById('prev-device-page').addEventListener('click', function() {
    if (currentDevicePage > 1) {
      currentDevicePage--;
      loadDevices();
    }
  });
  
  document.getElementById('next-device-page').addEventListener('click', function() {
    const maxPage = Math.ceil(totalDevices / devicePageSize);
    if (currentDevicePage < maxPage) {
      currentDevicePage++;
      loadDevices();
    }
  });
  
  // Apply filters
  document.getElementById('apply-filters').addEventListener('click', function() {
    currentPage = 1;
    loadSubscriptions();
  });
  
  document.getElementById('apply-device-filters').addEventListener('click', function() {
    currentDevicePage = 1;
    loadDevices();
  });
}

// Set up tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get target tab
      const targetTab = this.getAttribute('data-tab');
      
      // Remove active class from all tabs
      tabButtons.forEach(btn => {
        btn.classList.remove('active', 'border-red-600', 'text-red-600');
        btn.classList.add('border-transparent');
      });
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      
      // Activate selected tab
      this.classList.add('active', 'border-red-600', 'text-red-600');
      this.classList.remove('border-transparent');
      document.getElementById(`${targetTab}-tab`).classList.remove('hidden');
      
      // Load tab content
      if (targetTab === 'subscriptions') {
        loadSubscriptions();
      } else if (targetTab === 'devices') {
        loadDevices();
      } else if (targetTab === 'stats') {
        loadStats();
      }
    });
  });
}

// Set up dashboard
function setupDashboard() {
  // Load initial data
  loadSubscriptions();
}

// Handle login form submission
function handleLogin() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const loginError = document.getElementById('login-error');
  
  if (!username || !password) {
    loginError.textContent = 'Please enter both username and password';
    loginError.classList.remove('hidden');
    return;
  }
  
  fetch('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminName', data.name);
      showDashboard();
      setupDashboard();
      document.getElementById('admin-name').textContent = data.name;
    } else {
      loginError.textContent = data.message || 'Login failed';
      loginError.classList.remove('hidden');
    }
  })
  .catch(error => {
    console.error('Login error:', error);
    loginError.textContent = 'An error occurred. Please try again.';
    loginError.classList.remove('hidden');
  });
}

// Load subscriptions
function loadSubscriptions() {
  const token = localStorage.getItem('adminToken');
  const searchTerm = document.getElementById('search-subscription').value;
  const filterType = document.getElementById('filter-type').value;
  const filterStatus = document.getElementById('filter-status').value;
  const tableBody = document.getElementById('subscriptions-table-body');
  
  // Show loading indicator
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
        <div class="flex justify-center">
          <svg class="animate-spin h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </td>
    </tr>
  `;
  
  fetch(`/api/admin/subscriptions?page=${currentPage}&pageSize=${pageSize}&search=${searchTerm}&type=${filterType}&status=${filterStatus}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized, token might be expired
        localStorage.removeItem('adminToken');
        showLoginForm();
      }
      throw new Error(`Server responded with status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    subscriptions = data.subscriptions;
    totalSubscriptions = data.total;
    renderSubscriptions();
    updatePagination();
  })
  .catch(error => {
    console.error('Error loading subscriptions:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-4 text-center text-sm text-red-500">
          Failed to load subscriptions: ${error.message}
        </td>
      </tr>
    `;
  });
}

// Render subscriptions table
function renderSubscriptions() {
  const tableBody = document.getElementById('subscriptions-table-body');
  
  if (!subscriptions || subscriptions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
          No subscriptions found
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = subscriptions.map(subscription => {
    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    const isExpired = expiryDate < now;
    const statusClass = isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    const statusText = isExpired ? 'Expired' : 'Active';
    
    return `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="font-medium text-gray-900">${subscription.access_code}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">${subscription.customer_name || 'N/A'}</div>
          <div class="text-sm text-gray-500">${subscription.contact_info || 'No contact'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            ${subscription.type}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${subscription.device_count || 0} / ${subscription.device_limit}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${formatDate(subscription.expiry_date)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
            ${statusText}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button onclick="editSubscription('${subscription.id}')" class="text-blue-600 hover:text-blue-900 mr-3">
            Edit
          </button>
          <a href="/claim?code=${subscription.access_code}" target="_blank" class="text-green-600 hover:text-green-900 mr-3">
            View
          </a>
          <button onclick="deleteSubscription('${subscription.id}')" class="text-red-600 hover:text-red-900">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Update pagination info
function updatePagination() {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalSubscriptions);
  
  document.getElementById('subscription-range').textContent = `${start}-${end}`;
  document.getElementById('subscription-total').textContent = totalSubscriptions;
  
  // Update button states
  document.getElementById('prev-page').disabled = currentPage === 1;
  document.getElementById('next-page').disabled = end >= totalSubscriptions;
}

// Open new subscription modal
function openNewSubscriptionModal() {
  editMode = false;
  
  // Reset form
  document.getElementById('subscription-id').value = '';
  document.getElementById('customer-name').value = '';
  document.getElementById('email').value = '';
  document.getElementById('contact-info').value = '';
  document.getElementById('subscription-type').value = 'Premium';
  document.getElementById('device-limit').value = '2';
  document.getElementById('access-code').value = '';
  
  // Update modal title
  document.getElementById('modal-title').textContent = 'Add New Subscription';
  
  // Show modal
  document.getElementById('subscription-modal').classList.remove('hidden');
}

// Close modal
function closeModal() {
  document.getElementById('subscription-modal').classList.add('hidden');
}

// Generate random access code
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById('access-code').value = result;
}

// Edit subscription
window.editSubscription = function(id) {
  editMode = true;
  const token = localStorage.getItem('adminToken');
  
  fetch(`/api/admin/subscriptions/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch subscription details');
    }
    return response.json();
  })
  .then(subscription => {
    // Populate form
    document.getElementById('subscription-id').value = subscription.id;
    document.getElementById('customer-name').value = subscription.customer_name || '';
    document.getElementById('email').value = subscription.email || '';
    document.getElementById('contact-info').value = subscription.contact_info || '';
    document.getElementById('subscription-type').value = subscription.type;
    document.getElementById('device-limit').value = subscription.device_limit;
    document.getElementById('access-code').value = subscription.access_code;
    
    // Update modal title
    document.getElementById('modal-title').textContent = 'Edit Subscription';
    
    // Show modal
    document.getElementById('subscription-modal').classList.remove('hidden');
  })
  .catch(error => {
    console.error('Error fetching subscription:', error);
    alert('Error: ' + error.message);
  });
};

// Delete subscription
window.deleteSubscription = function(id) {
  if (!confirm('Are you sure you want to delete this subscription? This action cannot be undone.')) {
    return;
  }
  
  const token = localStorage.getItem('adminToken');
  
  fetch(`/api/admin/subscriptions/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to delete subscription');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      // Reload subscriptions
      loadSubscriptions();
    }
  })
  .catch(error => {
    console.error('Error deleting subscription:', error);
    alert('Error: ' + error.message);
  });
};

// Save subscription (create or update)
function saveSubscription() {
  const token = localStorage.getItem('adminToken');
  const subscriptionId = document.getElementById('subscription-id').value;
  
  const subscriptionData = {
    customer_name: document.getElementById('customer-name').value,
    email: document.getElementById('email').value,
    contact_info: document.getElementById('contact-info').value,
    type: document.getElementById('subscription-type').value,
    device_limit: parseInt(document.getElementById('device-limit').value),
    access_code: document.getElementById('access-code').value
  };
  
  const url = editMode ? `/api/admin/subscriptions/${subscriptionId}` : '/api/admin/subscriptions';
  const method = editMode ? 'PUT' : 'POST';
  
  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(subscriptionData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }
    return response.json();
  })
  .then(data => {
    // Close modal
    closeModal();
    
    // Reload subscriptions
    loadSubscriptions();
  })
  .catch(error => {
    console.error('Error saving subscription:', error);
    alert('Error: ' + error.message);
  });
}

// Load devices
function loadDevices() {
  const token = localStorage.getItem('adminToken');
  const searchTerm = document.getElementById('search-device').value;
  const filterSubscription = document.getElementById('filter-subscription').value;
  const tableBody = document.getElementById('devices-table-body');
  
  // Show loading indicator
  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">
        <div class="flex justify-center">
          <svg class="animate-spin h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </td>
    </tr>
  `;
  
  fetch(`/api/admin/devices?page=${currentDevicePage}&pageSize=${devicePageSize}&search=${searchTerm}&subscription=${filterSubscription}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized, token might be expired
        localStorage.removeItem('adminToken');
        showLoginForm();
      }
      throw new Error(`Server responded with status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    devices = data.devices;
    totalDevices = data.total;
    renderDevices();
    updateDevicePagination();
    
    // Also update the subscription filter dropdown
    updateSubscriptionFilter();
  })
  .catch(error => {
    console.error('Error loading devices:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-sm text-red-500">
          Failed to load devices: ${error.message}
        </td>
      </tr>
    `;
  });
}

// Render devices table
function renderDevices() {
  const tableBody = document.getElementById('devices-table-body');
  
  if (!devices || devices.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">
          No devices found
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = devices.map(device => {
    return `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="font-mono text-sm text-gray-900">${device.device_id.substring(0, 8)}...</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">${device.subscriptions.access_code}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">${device.subscriptions.customer_name || 'N/A'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${formatDate(device.first_seen)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${formatDate(device.last_active)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button onclick="deleteDevice('${device.id}')" class="text-red-600 hover:text-red-900">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Update device pagination info
function updateDevicePagination() {
  const start = (currentDevicePage - 1) * devicePageSize + 1;
  const end = Math.min(currentDevicePage * devicePageSize, totalDevices);
  
  document.getElementById('device-range').textContent = `${start}-${end}`;
  document.getElementById('device-total').textContent = totalDevices;
  
  // Update button states
  document.getElementById('prev-device-page').disabled = currentDevicePage === 1;
  document.getElementById('next-device-page').disabled = end >= totalDevices;
}

// Update subscription filter dropdown
function updateSubscriptionFilter() {
  const token = localStorage.getItem('adminToken');
  const filterSelect = document.getElementById('filter-subscription');
  
  // Keep selected value
  const selectedValue = filterSelect.value;
  
  fetch('/api/admin/subscriptions?pageSize=999', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch subscriptions for filter');
    }
    return response.json();
  })
  .then(data => {
    // Clear existing options except the first one
    while (filterSelect.options.length > 1) {
      filterSelect.remove(1);
    }
    
    // Add options for each subscription
    data.subscriptions.forEach(sub => {
      const option = document.createElement('option');
      option.value = sub.access_code;
      option.textContent = `${sub.access_code} (${sub.customer_name || 'N/A'})`;
      filterSelect.appendChild(option);
    });
    
    // Restore selected value if it exists
    if (selectedValue) {
      filterSelect.value = selectedValue;
    }
  })
  .catch(error => {
    console.error('Error loading subscription filter:', error);
  });
}

// Delete device
window.deleteDevice = function(id) {
  if (!confirm('Are you sure you want to remove this device? The user will need to re-authorize if they try to use this device again.')) {
    return;
  }
  
  const token = localStorage.getItem('adminToken');
  
  fetch(`/api/admin/devices/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to delete device');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      // Reload devices
      loadDevices();
    }
  })
  .catch(error => {
    console.error('Error deleting device:', error);
    alert('Error: ' + error.message);
  });
};

// Load statistics
function loadStats() {
  const token = localStorage.getItem('adminToken');
  
  fetch('/api/admin/stats', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized, token might be expired
        localStorage.removeItem('adminToken');
        showLoginForm();
      }
      throw new Error(`Server responded with status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    updateStatCards(data);
    renderCharts(data);
  })
  .catch(error => {
    console.error('Error loading stats:', error);
    alert('Error loading statistics: ' + error.message);
  });
}

// Update stat cards
function updateStatCards(data) {
  document.getElementById('total-subscriptions').textContent = data.totalSubscriptions;
  document.getElementById('active-subscriptions').textContent = data.activeSubscriptions;
  document.getElementById('expiring-soon').textContent = data.expiringSoon;
  document.getElementById('total-devices').textContent = data.totalDevices;
}

// Render charts
function renderCharts(data) {
  // Clean up old charts
  if (charts.subscriptionTypes) {
    charts.subscriptionTypes.destroy();
  }
  
  if (charts.newSubscriptions) {
    charts.newSubscriptions.destroy();
  }
  
  // Subscription types chart
  const typesCtx = document.getElementById('subscription-types-chart').getContext('2d');
  charts.subscriptionTypes = new Chart(typesCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(data.subscriptionTypes),
      datasets: [{
        data: Object.values(data.subscriptionTypes),
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        },
        title: {
          display: true,
          text: 'Active Subscription Types'
        }
      }
    }
  });
  
  // New subscriptions chart
  const newSubsCtx = document.getElementById('new-subscriptions-chart').getContext('2d');
  
  // Convert monthly data to arrays
  const months = Object.keys(data.monthlySignups).sort();
  const counts = months.map(month => data.monthlySignups[month]);
  
  // Format month labels
  const monthLabels = months.map(month => {
    const [year, monthNum] = month.split('-');
    return new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });
  
  charts.newSubscriptions = new Chart(newSubsCtx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'New Subscriptions',
        data: counts,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'New Subscriptions (Last 6 Months)'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}