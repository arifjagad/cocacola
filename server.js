require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
// Tambahkan device detector
const DeviceDetector = require('node-device-detector');
const deviceDetector = new DeviceDetector({
  clientIndexes: true,
  deviceIndexes: true,
  deviceAliasCode: false,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Set your Supabase credentials dari file .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Validasi kredensial Supabase
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials are missing in .env file');
  console.error('Please create a .env file with SUPABASE_URL and SUPABASE_KEY variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Add global event emitter for tracking attempts
const EventEmitter = require('events');
const attemptEmitter = new EventEmitter();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware untuk mencegah akses langsung ke file JavaScript dan HTML
app.use((req, res, next) => {
  // Headers untuk mencegah caching dan iframe embedding
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Headers untuk mencegah akses langsung ke file JS/HTML dari browser
  const path = req.path;
  if (path.endsWith('.js') || path.endsWith('.html')) {
    const referer = req.headers.referer;
    // Izinkan akses hanya jika referrer menunjukkan bahwa permintaan berasal dari website kita
    if (!referer || !referer.includes(req.headers.host)) {
      return res.status(403).send('Akses ditolak.');
    }
  }
  
  next();
});

// Serve main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Extract authorization token from Coca-Cola link
app.post('/api/extract-token', async (req, res) => {
  try {
    const { cocaColaLink } = req.body;
    
    if (!cocaColaLink || !cocaColaLink.includes('ayo.coca-cola.co.id')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid link', 
        message: 'Please provide a valid Coca-Cola link' 
      });
    }
    
    console.log(`Starting token extraction for link: ${cocaColaLink}`);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Enable request interception to capture network requests
      await page.setRequestInterception(true);
      
      let authToken = null;
      
      // Listen for requests and capture the authorization token
      page.on('request', request => {
        const url = request.url();
        const headers = request.headers();
        
        // Look for the userCoupons request
        if (url.includes('userCoupons')) {
          console.log('Found userCoupons request');
          if (headers.authorization) {
            authToken = headers.authorization;
            console.log('Extracted authorization token');
          }
        }
        request.continue();
      });
      
      // Set a timeout to ensure we don't hang indefinitely
      const timeout = setTimeout(async () => {
        if (!authToken) {
          await browser.close();
          res.status(408).json({ 
            success: false, 
            error: 'Timeout', 
            message: 'Timed out while trying to extract token' 
          });
        }
      }, 30000);
      
      // Navigate to the page
      await page.goto(cocaColaLink, { waitUntil: 'networkidle2', timeout: 25000 });
      
      // Wait a bit for all requests to finish
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      clearTimeout(timeout);
      
      if (!authToken) {
        // If we couldn't find the token in the initial load, try interacting with the page
        await page.evaluate(() => {
          // Click on elements that might trigger API calls
          document.querySelectorAll('button').forEach(btn => btn.click());
        });
        
        // Wait a bit more for potential requests
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      await browser.close();
      
      if (!authToken) {
        return res.status(404).json({ 
          success: false, 
          error: 'Token not found', 
          message: 'Could not extract authorization token from the link' 
        });
      }
      
      // Return the token
      return res.json({ 
        success: true, 
        token: authToken 
      });
      
    } catch (error) {
      await browser.close();
      throw error;
    }
    
  } catch (error) {
    console.error('Error extracting token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  }
});

// SSE endpoint for attempt tracking
app.get('/api/attempt-events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send an initial message
  res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);
  
  // Handle attempt updates
  const attemptHandler = (attempt) => {
    res.write(`data: ${JSON.stringify({ attempt })}\n\n`);
  };
  
  // Register event listener
  attemptEmitter.on('attempt', attemptHandler);
  
  // Handle client disconnect
  req.on('close', () => {
    attemptEmitter.removeListener('attempt', attemptHandler);
  });
});

// Claim code endpoint
app.post('/api/claim', async (req, res) => {
  try {
    const { packagingCode, authorization } = req.body;
    
    if (!packagingCode || !authorization) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const url = "https://us-central1-grivy-barcode.cloudfunctions.net/grabMainRedeem";
    
    const body = {
      data: {
        publicCode: "tccc-coke-utc-2025-main",
        packagingCode: packagingCode,
        domain: "ayo_coca_cola",
        terms_conditions_01: null,
        terms_conditions_02: null,
        terms_conditions_03: null
      }
    };

    const headers = {
      "Content-Type": "application/json",
      "Authorization": authorization,
      "Referer": "https://ayo.coca-cola.co.id/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36"
    };

    // Try to claim with up to maxAttempts
    const maxAttempts = 100;
    let attemptCount = 0;
    let success = false;
    let finalResult = null;
    
    while (attemptCount < maxAttempts && !success) {
      attemptCount++;
      
      // Emit the attempt number for SSE
      attemptEmitter.emit('attempt', attemptCount);
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        });
        
        if (response.status === 429) {
          // Rate limit hit, will retry after delay
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
          continue;
        }
        
        const result = await response.json();
        finalResult = result;
        
        if (result.error) {
          if (result.error.message === 'coupons_limit_daily' && result.error.status === 'OUT_OF_RANGE') {
            // Daily limit reached, stop attempts
            return res.json({
              success: false,
              status: 'LIMIT_REACHED',
              message: 'Coupons sudah limit, 1 akun hanya 3x redeem saja',
              attempts: attemptCount,
              result
            });
          } else if (result.error.message === 'packaging_code_not_found' && result.error.status === 'UNAUTHENTICATED') {
            // Invalid coupon, stop attempts
            return res.json({
              success: false,
              status: 'INVALID_CODE',
              message: 'Coupons tidak valid',
              attempts: attemptCount,
              result
            });
          }
          // Other error, will retry
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        } else {
          // Success, stop attempts
          success = true;
          
          // Try to parse the result data to make it easier for the client
          let parsedData = null;
          try {
            // This is for handling if the data comes as a string that needs parsing
            if (typeof result.data === 'string') {
              parsedData = { result: JSON.parse(result.data) };
            } else if (result.data) {
              parsedData = { result: result.data };
            }
          } catch (parseError) {
            console.log("Error parsing result data:", parseError);
          }
          
          return res.json({
            success: true,
            attempts: attemptCount,
            result: {
              ...result,
              parsedData
            }
          });
        }
      } catch (error) {
        console.error(`Attempt ${attemptCount} failed:`, error);
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay on error
      }
    }
    
    // If we reached max attempts without success
    return res.json({
      success: false,
      status: 'MAX_ATTEMPTS',
      message: 'Reached maximum number of attempts without success',
      attempts: attemptCount,
      result: finalResult
    });
    
  } catch (error) {
    console.error('Error in claim endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  }
});

// Serve claim page when a code is provided
app.get('/claim', (req, res) => {
  const accessCode = req.query.code;
  
  if (!accessCode) {
    // If no access code, redirect to homepage
    return res.redirect('/');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'claim.html'));
});

// API endpoint to check subscription status
app.post('/api/check-subscription', async (req, res) => {
  try {
    const { accessCode, deviceId } = req.body;
    
    if (!accessCode || !deviceId) {
      return res.status(400).json({
        valid: false,
        message: 'Access code and device ID are required'
      });
    }

    // Ambil informasi perangkat dari user-agent
    const userAgent = req.headers['user-agent'];
    const deviceInfo = deviceDetector.detect(userAgent);
    
    // Ambil IP address pengguna
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Generate fingerprint gabungan dari informasi device dan IP
    const deviceFingerprint = generateDeviceFingerprint(deviceInfo, ipAddress);
    
    console.log(`Subscription check - Device: ${JSON.stringify(deviceInfo.device)}, IP: ${ipAddress}`);
    
    // Query Supabase for the subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('access_code', accessCode)
      .single();
    
    if (error || !subscription) {
      console.log(`Invalid subscription check - Code: ${accessCode}, IP: ${ipAddress}`);
      return res.status(404).json({
        valid: false,
        message: 'Invalid access code or subscription not found'
      });
    }
    
    // Check if subscription is active
    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    
    if (expiryDate < now) {
      console.log(`Expired subscription - Code: ${accessCode}, IP: ${ipAddress}`);
      return res.status(403).json({
        valid: false,
        message: 'Your subscription has expired'
      });
    }
    
    // Check devices
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .eq('subscription_id', subscription.id);
    
    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      return res.status(500).json({
        valid: false,
        message: 'Error checking device status'
      });
    }
    
    // Find if this device is already registered by deviceId, fingerprint OR ip address
    const thisDevice = devices.find(d => 
      d.device_id === deviceId || 
      d.device_fingerprint === deviceFingerprint || 
      d.ip_address === ipAddress
    );
    
    if (!thisDevice) {
      // This is a new device, check if we've reached the limit
      if (devices.length >= subscription.device_limit) {
        console.log(`Device limit reached - Code: ${accessCode}, IP: ${ipAddress}, Device: ${deviceInfo.device.type}`);
        return res.status(403).json({
          valid: false,
          message: `Device limit reached. This subscription can only be used on ${subscription.device_limit} devices.`
        });
      }
      
      // Register this device with full device info
      const { error: registerError } = await supabase
        .from('devices')
        .insert([{
          subscription_id: subscription.id,
          device_id: deviceId,
          ip_address: ipAddress,
          device_fingerprint: deviceFingerprint,
          device_type: deviceInfo.device.type,
          device_brand: deviceInfo.device.brand,
          device_model: deviceInfo.device.model,
          os_name: deviceInfo.os.name,
          os_version: deviceInfo.os.version,
          client_type: deviceInfo.client.type,
          client_name: deviceInfo.client.name,
          client_version: deviceInfo.client.version,
          user_agent: userAgent,
          last_active: new Date().toISOString(),
          first_seen: new Date().toISOString()
        }]);
      
      if (registerError) {
        console.error('Error registering device:', registerError);
        return res.status(500).json({
          valid: false,
          message: 'Error registering your device'
        });
      }
      
      console.log(`New device registered - Code: ${accessCode}, Type: ${deviceInfo.device.type}, Brand: ${deviceInfo.device.brand}`);
    } else {
      // Update device record with current info
      const updates = {
        last_active: new Date().toISOString(),
        device_fingerprint: deviceFingerprint
      };
      
      // Update device info if it was previously incomplete
      if (!thisDevice.device_type) updates.device_type = deviceInfo.device.type;
      if (!thisDevice.device_brand) updates.device_brand = deviceInfo.device.brand;
      if (!thisDevice.device_model) updates.device_model = deviceInfo.device.model;
      if (!thisDevice.os_name) updates.os_name = deviceInfo.os.name;
      if (!thisDevice.os_version) updates.os_version = deviceInfo.os.version;
      if (!thisDevice.client_type) updates.client_type = deviceInfo.client.type;
      if (!thisDevice.client_name) updates.client_name = deviceInfo.client.name;
      if (!thisDevice.client_version) updates.client_version = deviceInfo.client.version;
      
      // Update IP if it changed
      if (thisDevice.ip_address !== ipAddress) {
        updates.ip_address = ipAddress;
      }
      
      // Update device ID if it was previously only tracked by IP
      if (thisDevice.device_id !== deviceId) {
        updates.device_id = deviceId;
      }
      
      await supabase
        .from('devices')
        .update(updates)
        .eq('id', thisDevice.id);
        
      console.log(`Existing device updated - Code: ${accessCode}, Device: ${deviceInfo.device.type}, Brand: ${deviceInfo.device.brand}`);
    }
    
    // Memformat informasi perangkat untuk respon
    const formattedDeviceInfo = formatDeviceInfo(deviceInfo);
    
    // Return subscription info
    return res.json({
      valid: true,
      subscriptionType: subscription.type,
      expiryDate: subscription.expiry_date,
      deviceCount: thisDevice ? devices.length : devices.length + 1,
      deviceLimit: subscription.device_limit,
      deviceInfo: formattedDeviceInfo
    });
    
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error while checking subscription'
    });
  }
});

// Fungsi untuk menghasilkan device fingerprint
function generateDeviceFingerprint(deviceInfo, ipAddress) {
  try {
    // Mengambil subset data yang paling unik dari device info
    const deviceData = {
      type: deviceInfo.device.type || '',
      brand: deviceInfo.device.brand || '',
      model: deviceInfo.device.model || '',
      os: deviceInfo.os.name || '',
      osVersion: deviceInfo.os.version || '',
      browser: deviceInfo.client.name || '',
      // Gunakan 2 octet pertama dari IP untuk mempertahankan privacy tapi tetap melacak lokasi
      ipPrefix: ipAddress ? ipAddress.split('.').slice(0, 2).join('.') : ''
    };
    
    // Combine data into a string and create a hash
    const dataString = JSON.stringify(deviceData);
    return createSimpleHash(dataString);
  } catch (err) {
    console.error('Error generating device fingerprint:', err);
    // Fallback to a simple random string
    return Math.random().toString(36).substring(2, 15);
  }
}

// Fungsi simple hashing untuk fingerprint
function createSimpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to a more readable string format
  return Math.abs(hash).toString(16).substring(0, 10);
}

// Fungsi untuk memformat device info untuk ditampilkan ke user
function formatDeviceInfo(deviceInfo) {
  let deviceDisplay = 'Unknown Device';
  
  try {
    // Format device info yang lebih user-friendly
    if (deviceInfo.device.brand) {
      deviceDisplay = deviceInfo.device.brand;
      if (deviceInfo.device.model) {
        deviceDisplay += ` ${deviceInfo.device.model}`;
      }
    } else if (deviceInfo.device.type) {
      deviceDisplay = deviceInfo.device.type.charAt(0).toUpperCase() + deviceInfo.device.type.slice(1);
    }
    
    // Add OS info if available
    let osDisplay = '';
    if (deviceInfo.os.name) {
      osDisplay = deviceInfo.os.name;
      if (deviceInfo.os.version) {
        osDisplay += ` ${deviceInfo.os.version}`;
      }
    }
    
    // Add browser info if available
    let browserDisplay = '';
    if (deviceInfo.client.name) {
      browserDisplay = deviceInfo.client.name;
      if (deviceInfo.client.version) {
        // Just get major version number
        const majorVersion = deviceInfo.client.version.split('.')[0];
        browserDisplay += ` ${majorVersion}`;
      }
    }
    
    return {
      device: deviceDisplay,
      os: osDisplay,
      browser: browserDisplay
    };
  } catch (err) {
    console.error('Error formatting device info:', err);
    return { device: 'Unknown Device' };
  }
}

// Migrate existing device records - buat endpoint untuk administrator
app.post('/api/admin/migrate-devices', async (req, res) => {
  try {
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Update schema database untuk devices
    await updateDevicesSchema();
    
    // Ambil semua device yang perlu dimigrasi (belum memiliki kolom baru)
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*');
    
    if (error) {
      throw new Error('Failed to fetch devices');
    }
    
    console.log(`Found ${devices.length} devices to check for migration`);
    
    // Update setiap device
    let updatedCount = 0;
    for (const device of devices) {
      // Hanya update device yang belum memiliki device_fingerprint
      if (!device.device_fingerprint) {
        // Generate fingerprint sederhana untuk migrasi
        const fingerprint = Math.random().toString(36).substring(2, 15);
        
        await supabase
          .from('devices')
          .update({
            device_fingerprint: fingerprint,
            device_type: device.device_type || 'unknown',
            first_seen: device.first_seen || device.last_active || new Date().toISOString()
          })
          .eq('id', device.id);
          
        updatedCount++;
      }
    }
    
    return res.json({
      success: true,
      migratedCount: updatedCount
    });
  } catch (error) {
    console.error('Error during device migration:', error);
    res.status(500).json({ 
      message: 'Error migrating devices', 
      error: error.message 
    });
  }
});

// Fungsi untuk update schema database devices
async function updateDevicesSchema() {
  try {
    // Tambahkan kolom-kolom baru jika belum ada
    await supabase.query(`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS device_fingerprint varchar,
      ADD COLUMN IF NOT EXISTS device_type varchar,
      ADD COLUMN IF NOT EXISTS device_brand varchar,
      ADD COLUMN IF NOT EXISTS device_model varchar,
      ADD COLUMN IF NOT EXISTS os_name varchar,
      ADD COLUMN IF NOT EXISTS os_version varchar,
      ADD COLUMN IF NOT EXISTS client_type varchar,
      ADD COLUMN IF NOT EXISTS client_name varchar,
      ADD COLUMN IF NOT EXISTS client_version varchar,
      ADD COLUMN IF NOT EXISTS user_agent text,
      ADD COLUMN IF NOT EXISTS first_seen timestamptz DEFAULT NOW()
    `);
    console.log('Successfully updated devices schema');
    return true;
  } catch (error) {
    console.error('Error updating devices schema:', error);
    throw error;
  }
}

// Get devices with more details (admin endpoint)
app.get('/api/admin/devices', async (req, res) => {
  try {
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || '';
    const subscription = req.query.subscription || '';
    
    // Start building query with expanded fields
    let query = supabase
      .from('devices')
      .select('*, subscriptions!inner(*)', { count: 'exact' });
    
    // Apply filters dengan lebih banyak field untuk search
    if (search) {
      query = query.or(
        `device_id.ilike.%${search}%,` +
        `ip_address.ilike.%${search}%,` +
        `subscriptions.access_code.ilike.%${search}%,` +
        `device_brand.ilike.%${search}%,` +
        `device_model.ilike.%${search}%,` +
        `os_name.ilike.%${search}%`
      );
    }
    
    if (subscription) {
      query = query.eq('subscriptions.access_code', subscription);
    }
    
    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // Execute query
    const { data, error, count } = await query.range(from, to).order('last_active', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return res.json({
      devices: data,
      total: count,
      page,
      pageSize
    });
    
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Error fetching devices' });
  }
});

// Route untuk halaman devices management
app.get('/admin/devices/:adminToken', (req, res) => {
  const { adminToken } = req.params;
  
  // Cek apakah token admin valid
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).send('Akses ditolak. Token admin tidak valid.');
  }
  
  // Kirim halaman admin devices
  res.sendFile(path.join(__dirname, 'public', 'admin', 'devices.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});
