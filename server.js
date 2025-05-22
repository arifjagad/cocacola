require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

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
    
    // Konfigurasi Puppeteer yang lebih lengkap untuk lingkungan produksi
    const launchOptions = {
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1280,720'
      ],
      timeout: 60000 // Tambahkan timeout yang lebih lama (60 detik)
    };
    
    console.log('Launching browser with options:', JSON.stringify(launchOptions));
    const browser = await puppeteer.launch(launchOptions);
    
    try {
      const page = await browser.newPage();
      
      // Set user agent untuk meniru browser mobile
      await page.setUserAgent('Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Mobile Safari/537.36');
      
      // Set viewport untuk meniru ukuran layar mobile
      await page.setViewport({
        width: 412,
        height: 915,
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true
      });
      
      console.log('Setting up request interception');
      
      // Enable request interception to capture network requests
      await page.setRequestInterception(true);
      
      let authToken = null;
      let requestsLogged = 0;
      
      // Listen for requests and capture the authorization token
      page.on('request', request => {
        const url = request.url();
        const headers = request.headers();
        
        // Log setiap beberapa request untuk debugging
        if (requestsLogged < 5 || requestsLogged % 20 === 0) {
          console.log(`Request #${requestsLogged+1}: ${url.substring(0, 100)}...`);
        }
        requestsLogged++;
        
        // Look for the userCoupons request or any other API request
        if (url.includes('userCoupons') || url.includes('grivy') || url.includes('redeem')) {
          console.log('Found potential API request:', url);
          console.log('Headers:', JSON.stringify(headers));
          
          if (headers.authorization) {
            authToken = headers.authorization;
            console.log('Extracted authorization token');
          }
        }
        request.continue();
      });
      
      // Log semua respons untuk debugging
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('api') || url.includes('grivy')) {
          console.log(`Response from ${url}: ${response.status()}`);
          try {
            const contentType = response.headers()['content-type'];
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              console.log('Response data:', JSON.stringify(data).substring(0, 200) + '...');
            }
          } catch (e) {
            console.log('Could not parse response as JSON');
          }
        }
      });
      
      // Log console messages dari halaman
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));
      
      // Set a timeout to ensure we don't hang indefinitely
      const timeout = setTimeout(async () => {
        if (!authToken) {
          console.log('Timeout reached without finding token');
          await browser.close();
          res.status(408).json({ 
            success: false, 
            error: 'Timeout', 
            message: 'Timed out while trying to extract token' 
          });
        }
      }, 40000); // Tambah timeout menjadi 40 detik
      
      console.log(`Navigating to: ${cocaColaLink}`);
      
      // Navigate to the page with longer timeout
      await page.goto(cocaColaLink, { 
        waitUntil: 'networkidle2', 
        timeout: 35000  // 35 detik
      });
      
      console.log('Page loaded, waiting for API calls');
      
      // Wait a bit longer for all requests to finish
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      clearTimeout(timeout);
      
      if (!authToken) {
        // Coba klik tombol pada halaman untuk memicu request
        console.log('Token not found initially, trying to interact with page');
        
        // Ambil screenshot untuk debugging
        const screenshot = await page.screenshot({encoding: 'base64'});
        console.log('Page screenshot (base64):', screenshot.substring(0, 100) + '...');
        
        // Tampilkan HTML halaman untuk debugging
        const pageContent = await page.content();
        console.log('Page HTML:', pageContent.substring(0, 500) + '...');
        
        try {
          // Klik pada elemen yang mungkin memicu API calls
          await page.evaluate(() => {
            console.log('Clicking on buttons');
            // Click on elements that might trigger API calls
            document.querySelectorAll('button, a.btn, [role="button"], .clickable, .button').forEach(el => {
              console.log('Clicking element:', el.outerHTML);
              el.click();
            });
            
            // Coba interaksi dengan elemen input
            document.querySelectorAll('input').forEach(input => {
              console.log('Focusing input:', input.outerHTML);
              input.focus();
              input.blur();
            });
          });
          
          // Wait for potential network activity
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Jika masih tidak ada token, coba scrolling halaman
          if (!authToken) {
            await page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight / 2);
              setTimeout(() => {
                window.scrollTo(0, document.body.scrollHeight);
              }, 500);
            });
            
            // Wait more
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (interactionError) {
          console.error('Error during page interaction:', interactionError);
        }
      }
      
      await browser.close();
      
      if (!authToken) {
        console.log('Failed to extract token after all attempts');
        return res.status(404).json({ 
          success: false, 
          error: 'Token not found', 
          message: 'Could not extract authorization token from the link. Pastikan link coca-cola valid dan belum kadaluarsa.' 
        });
      }
      
      // Return the token
      console.log('Successfully extracted token');
      return res.json({ 
        success: true, 
        token: authToken 
      });
      
    } catch (error) {
      console.error('Error during token extraction process:', error);
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
    const maxAttempts = 10; // Reduced to 10 attempts per code (total 30 for 3 codes)
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
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
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
      message: 'Sudah 10x coba namun belum berhasil, silakan coba lagi',
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

    // Ambil IP address pengguna
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Subscription check - Device ID: ${deviceId.substring(0, 8)}... IP: ${ipAddress}`);
    
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
    
    // Find if this device is already registered by deviceId OR ip address
    const thisDevice = devices.find(d => d.device_id === deviceId || d.ip_address === ipAddress);
    
    if (!thisDevice) {
      // This is a new device, check if we've reached the limit
      if (devices.length >= subscription.device_limit) {
        console.log(`Device limit reached - Code: ${accessCode}, IP: ${ipAddress}, Device ID: ${deviceId.substring(0, 8)}...`);
        return res.status(403).json({
          valid: false,
          message: `Device limit reached. This subscription can only be used on ${subscription.device_limit} devices.`
        });
      }
      
      // Register this device with both deviceId AND IP address
      const { error: registerError } = await supabase
        .from('devices')
        .insert([
          {
            subscription_id: subscription.id,
            device_id: deviceId,
            ip_address: ipAddress,
            last_active: new Date().toISOString(),
            first_seen: new Date().toISOString()
          }
        ]);
      
      if (registerError) {
        console.error('Error registering device:', registerError);
        return res.status(500).json({
          valid: false,
          message: 'Error registering your device'
        });
      }
      
      console.log(`New device registered - Code: ${accessCode}, IP: ${ipAddress}, Device ID: ${deviceId.substring(0, 8)}...`);
    } else {
      // Update device record with both current deviceId and IP
      const updates = {
        last_active: new Date().toISOString()
      };
      
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
        
      console.log(`Existing device updated - Code: ${accessCode}, IP: ${ipAddress}, Device ID: ${deviceId.substring(0, 8)}...`);
    }
    
    // Return subscription info - dengan informasi yang lebih sederhana
    return res.json({
      valid: true,
      subscriptionType: subscription.type,
      expiryDate: subscription.expiry_date,
      deviceCount: thisDevice ? devices.length : devices.length + 1,
      deviceLimit: subscription.device_limit
    });
    
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error while checking subscription'
    });
  }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // TODO: Replace with your actual auth logic
    // For demo, hardcoding an admin user - in production use proper auth with hashed passwords
    if (username === 'admin' && password === 'adminpassword123') {
      // Create a simple JWT-like token
      const token = Buffer.from(JSON.stringify({
        userId: 'admin1',
        name: 'Admin User',
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      })).toString('base64');
      
      return res.json({
        success: true,
        token,
        name: 'Admin User'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Verify admin token
app.post('/api/admin/verify-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Decode token (simple implementation - use proper JWT verification in production)
    const decodedToken = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Check if token is expired
    if (decodedToken.exp < Date.now()) {
      return res.status(401).json({ valid: false });
    }
    
    return res.json({ valid: true, name: decodedToken.name });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false });
  }
});

// Get subscriptions (admin endpoint)
app.get('/api/admin/subscriptions', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const status = req.query.status || '';
    
    // Start building query
    let query = supabase.from('subscriptions').select('*, devices(count)', { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,access_code.ilike.%${search}%,email.ilike.%${search}%,contact_info.ilike.%${search}%`);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (status) {
      const now = new Date().toISOString();
      if (status === 'active') {
        query = query.gt('expiry_date', now);
      } else if (status === 'expired') {
        query = query.lt('expiry_date', now);
      }
    }
    
    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // Execute query
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Format response
    const subscriptions = data.map(sub => ({
      ...sub,
      device_count: sub.devices?.[0]?.count || 0
    }));
    
    return res.json({
      subscriptions,
      total: count,
      page,
      pageSize
    });
    
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Error fetching subscriptions' });
  }
});

// Get subscription by ID (admin endpoint)
app.get('/api/admin/subscriptions/:id', async (req, res) => {
  try {
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    return res.json(data);
    
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ message: 'Error fetching subscription' });
  }
});

// Update subscription (admin endpoint) - memperbaiki autentikasi
app.put('/api/admin/subscriptions/:id', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const { customer_name, email, contact_info, type, device_limit, access_code, is_active, update_expiry } = req.body;
    
    // Check if the subscription exists
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Update fields
    const updates = {};
    if (customer_name !== undefined) updates.customer_name = customer_name;
    if (email !== undefined) updates.email = email;
    if (contact_info !== undefined) updates.contact_info = contact_info;
    if (device_limit !== undefined) updates.device_limit = device_limit;
    if (access_code !== undefined) updates.access_code = access_code;
    if (is_active !== undefined) updates.is_active = is_active;
    
    // Jika tipe berubah atau update_expiry diset true, update tanggal kedaluwarsa
    if (type !== undefined && (type !== existingSubscription.type || update_expiry)) {
      updates.type = type;
      
      // Calculate new expiry date based on type
      let expiryDate = new Date();
      if (type === 'Trial') {
        // Untuk Trial: tambahkan tepat 1 hari
        expiryDate.setDate(expiryDate.getDate() + 1);
      } else if (type === 'Premium') {
        // Untuk Premium: tambahkan tepat 2 bulan
        expiryDate = new Date('2025-06-30T23:59:59');
      } else {
        // Default (fallback): tambahkan 2 bulan
        expiryDate.setMonth(expiryDate.getMonth() + 2);
      }
      
      updates.expiry_date = expiryDate.toISOString();
      console.log(`Updating subscription to type: ${type}, new expiry: ${expiryDate.toISOString()}`);
    } else if (type !== undefined) {
      // Jika tipe berubah tapi tidak perlu update expiry
      updates.type = type;
    }
    
    // Update subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) {
      throw error;
    }
    
    return res.json(data[0]);
    
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: 'Error updating subscription', error: error.message });
  }
});

// Create subscription (admin endpoint) - memperbaiki autentikasi dan expiry date
app.post('/api/admin/subscriptions', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { customer_name, email, contact_info, type, device_limit, access_code } = req.body;
    
    // Calculate expiry date based on subscription type
    let expiryDate = new Date();
    if (type === 'Trial') {
      // Untuk Trial: tambahkan tepat 1 hari
      expiryDate.setDate(expiryDate.getDate() + 1); 
    } else if (type === 'Premium') {
      // Untuk Premium: tambahkan tepat 2 bulan
      expiryDate = new Date('2025-06-30T23:59:59');
    } else {
      // Default (fallback): tambahkan 2 bulan
      expiryDate.setMonth(expiryDate.getMonth() + 2);
    }
    
    console.log(`Creating subscription with type: ${type}, expiry: ${expiryDate.toISOString()}`);
    
    // Create new subscription
    const subscription = {
      customer_name,
      email,
      contact_info,
      type,
      device_limit: device_limit || (type === 'Trial' ? 1 : 3), // Default berdasarkan tipe
      expiry_date: expiryDate.toISOString(),
      created_at: new Date().toISOString(),
      is_active: true
    };
    
    // If access_code is provided, use it
    if (access_code) {
      subscription.access_code = access_code;
    } else {
      // Otherwise generate a random one
      subscription.access_code = Math.random().toString(36).substring(2, 10);
    }
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscription])
      .select();
    
    if (error) {
      throw error;
    }
    
    return res.status(201).json(data[0]);
    
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Error creating subscription', error: error.message });
  }
});

// Delete subscription (admin endpoint) - memperbaiki autentikasi
app.delete('/api/admin/subscriptions/:id', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    // First delete all devices linked to this subscription
    await supabase
      .from('devices')
      .delete()
      .eq('subscription_id', id);
    
    // Then delete the subscription
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return res.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ message: 'Error deleting subscription', error: error.message });
  }
});

// Get devices (admin endpoint) - memperbaiki autentikasi
app.get('/api/admin/devices', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || '';
    const subscription = req.query.subscription || '';
    
    // Start building query
    let query = supabase
      .from('devices')
      .select('*, subscriptions!inner(*)', { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.or(`device_id.ilike.%${search}%,subscriptions.access_code.ilike.%${search}%,ip_address.ilike.%${search}%`);
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

// Delete device (admin endpoint) - memperbaiki autentikasi
app.delete('/api/admin/devices/:id', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return res.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ message: 'Error deleting device', error: error.message });
  }
});

// Get stats (admin endpoint) - memperbaiki autentikasi
app.get('/api/admin/stats', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const now = new Date().toISOString();
    const threedays = new Date();
    threedays.setDate(threedays.getDate() + 3);
    
    // Get total subscriptions
    const { count: totalSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true });
    
    // Get active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gt('expiry_date', now);
    
    // Get expiring soon
    const { count: expiringSoon } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gt('expiry_date', now)
      .lt('expiry_date', threedays.toISOString());
    
    // Get total devices
    const { count: totalDevices } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true });
    
    // Get subscription type breakdown
    const { data: subscriptionTypes } = await supabase
      .from('subscriptions')
      .select('type')
      .gt('expiry_date', now);
    
    const typeCount = {
      Basic: 0,
      Premium: 0,
      Ultimate: 0
    };
    
    subscriptionTypes.forEach(sub => {
      if (typeCount[sub.type] !== undefined) {
        typeCount[sub.type]++;
      }
    });
    
    // Get new subscriptions per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: newSubscriptions } = await supabase
      .from('subscriptions')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString());
    
    const monthlySignups = {};
    
    // Initialize all months
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlySignups[monthKey] = 0;
    }
    
    // Count signups by month
    newSubscriptions.forEach(sub => {
      const date = new Date(sub.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlySignups[monthKey] !== undefined) {
        monthlySignups[monthKey]++;
      }
    });
    
    return res.json({
      totalSubscriptions,
      activeSubscriptions,
      expiringSoon,
      totalDevices,
      subscriptionTypes: typeCount,
      monthlySignups
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// Hapus route login admin yang sudah ada (tidak diperlukan lagi)
// Tambahkan route admin dengan token dalam URL
app.get('/admin/:adminToken', (req, res) => {
  const { adminToken } = req.params;
  
  // Cek apakah token admin valid (menggunakan token statis dari .env)
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).send('Akses ditolak. Token admin tidak valid.');
  }
  
  // Jika valid, kirim halaman admin
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Modifikasi endpoint admin API untuk menggunakan token di URL atau parameter
app.get('/api/admin/subscriptions', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const status = req.query.status || '';
    
    // Start building query
    let query = supabase.from('subscriptions').select('*, devices(count)', { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,access_code.ilike.%${search}%,email.ilike.%${search}%,contact_info.ilike.%${search}%`);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (status) {
      const now = new Date().toISOString();
      if (status === 'active') {
        query = query.gt('expiry_date', now);
      } else if (status === 'expired') {
        query = query.lt('expiry_date', now);
      }
    }
    
    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // Execute query
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Format response
    const subscriptions = data.map(sub => ({
      ...sub,
      device_count: sub.devices?.[0]?.count || 0
    }));
    
    return res.json({
      subscriptions,
      total: count,
      page,
      pageSize
    });
    
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Error fetching subscriptions' });
  }
});

// Ubah semua endpoint admin lainnya untuk menggunakan logika yang sama
app.get('/api/admin/subscriptions/:id', async (req, res) => {
  try {
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    return res.json(data);
    
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ message: 'Error fetching subscription' });
  }
});

// Endpoint untuk menambahkan subscription dengan URL unik
app.get('/add-subscription/:adminToken', (req, res) => {
  const { adminToken } = req.params;
  
  // Cek apakah token admin valid
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).send('Akses ditolak. Token admin tidak valid.');
  }
  
  // Kirim halaman form tambah subscription
  res.sendFile(path.join(__dirname, 'public', 'admin', 'add-subscription.html'));
});

// Create subscription (admin endpoint) - memperbaiki autentikasi dan expiry date
app.post('/api/admin/subscriptions', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { customer_name, email, contact_info, type, device_limit, access_code } = req.body;
    
    // Calculate expiry date based on subscription type
    let expiryDate = new Date();
    if (type === 'Trial') {
      // Untuk Trial: tambahkan tepat 1 hari
      expiryDate.setDate(expiryDate.getDate() + 1); 
    } else if (type === 'Premium') {
      // Untuk Premium: tambahkan tepat 2 bulan
      expiryDate.setMonth(expiryDate.getMonth() + 2);
    } else {
      // Default (fallback): tambahkan 2 bulan
      expiryDate.setMonth(expiryDate.getMonth() + 2);
    }
    
    console.log(`Creating subscription with type: ${type}, expiry: ${expiryDate.toISOString()}`);
    
    // Create new subscription
    const subscription = {
      customer_name,
      email,
      contact_info,
      type,
      device_limit: device_limit || (type === 'Trial' ? 1 : 3), // Default berdasarkan tipe
      expiry_date: expiryDate.toISOString(),
      created_at: new Date().toISOString(),
      is_active: true
    };
    
    // If access_code is provided, use it
    if (access_code) {
      subscription.access_code = access_code;
    } else {
      // Otherwise generate a random one
      subscription.access_code = Math.random().toString(36).substring(2, 10);
    }
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscription])
      .select();
    
    if (error) {
      throw error;
    }
    
    return res.status(201).json(data[0]);
    
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Error creating subscription', error: error.message });
  }
});

// Update subscription (admin endpoint) - memperbaiki expiry date pada update
app.put('/api/admin/subscriptions/:id', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const { customer_name, email, contact_info, type, device_limit, access_code, is_active, update_expiry } = req.body;
    
    // Check if the subscription exists
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Update fields
    const updates = {};
    if (customer_name !== undefined) updates.customer_name = customer_name;
    if (email !== undefined) updates.email = email;
    if (contact_info !== undefined) updates.contact_info = contact_info;
    if (device_limit !== undefined) updates.device_limit = device_limit;
    if (access_code !== undefined) updates.access_code = access_code;
    if (is_active !== undefined) updates.is_active = is_active;
    
    // Jika tipe berubah atau update_expiry diset true, update tanggal kedaluwarsa
    if (type !== undefined && (type !== existingSubscription.type || update_expiry)) {
      updates.type = type;
      
      // Calculate new expiry date based on type
      let expiryDate = new Date();
      if (type === 'Trial') {
        // Untuk Trial: tambahkan tepat 1 hari
        expiryDate.setDate(expiryDate.getDate() + 1);
      } else if (type === 'Premium') {
        // Untuk Premium: tambahkan tepat 2 bulan
        expiryDate.setMonth(expiryDate.getMonth() + 2);
      } else {
        // Default (fallback): tambahkan 2 bulan
        expiryDate.setMonth(expiryDate.getMonth() + 2);
      }
      
      updates.expiry_date = expiryDate.toISOString();
      console.log(`Updating subscription to type: ${type}, new expiry: ${expiryDate.toISOString()}`);
    } else if (type !== undefined) {
      // Jika tipe berubah tapi tidak perlu update expiry
      updates.type = type;
    }
    
    // Update subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) {
      throw error;
    }
    
    return res.json(data[0]);
    
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: 'Error updating subscription', error: error.message });
  }
});

// Delete subscription (admin endpoint) - memperbaiki autentikasi
app.delete('/api/admin/subscriptions/:id', async (req, res) => {
  try {
    // Verifikasi admin token dari header atau query parameter
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    // First delete all devices linked to this subscription
    await supabase
      .from('devices')
      .delete()
      .eq('subscription_id', id);
    
    // Then delete the subscription
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return res.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ message: 'Error deleting subscription', error: error.message });
  }
});

// Migrate existing device records - buat endpoint untuk administrator
app.post('/api/admin/migrate-devices', async (req, res) => {
  try {
    const adminToken = req.query.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Ambil semua device yang belum memiliki IP
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .is('ip_address', null);
    
    if (error) {
      throw new Error('Failed to fetch devices');
    }
    
    console.log(`Found ${devices.length} devices without IP address`);
    
    // Update schema jika belum memiliki kolom ip_address dan first_seen
    try {
      // Periksa apakah kolom sudah ada
      const { error: columnCheckError } = await supabase
        .rpc('column_exists', { 
          table_name: 'devices', 
          column_name: 'ip_address' 
        });
      
      if (columnCheckError) {
        // Kolom belum ada, tambahkan
        await supabase.query(`
          ALTER TABLE devices 
          ADD COLUMN IF NOT EXISTS ip_address varchar,
          ADD COLUMN IF NOT EXISTS first_seen timestamptz DEFAULT NOW()
        `);
        console.log('Added ip_address and first_seen columns to devices table');
      }
    } catch (schemaError) {
      console.log('Error checking schema, continuing anyway:', schemaError);
    }
    
    // Update setiap device
    for (const device of devices) {
      await supabase
        .from('devices')
        .update({
          ip_address: 'unknown',
          first_seen: device.last_active || new Date().toISOString()
        })
        .eq('id', device.id);
    }
    
    return res.json({
      success: true,
      migratedCount: devices.length
    });
  } catch (error) {
    console.error('Error during device migration:', error);
    res.status(500).json({ 
      message: 'Error migrating devices', 
      error: error.message 
    });
  }
});

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
    
    // Start building query with IP address field
    let query = supabase
      .from('devices')
      .select('*, subscriptions!inner(*)', { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.or(`device_id.ilike.%${search}%,subscriptions.access_code.ilike.%${search}%,ip_address.ilike.%${search}%`);
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