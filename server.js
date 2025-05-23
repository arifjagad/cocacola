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

// **OPTIMIZATION 1: Browser Pool Management**
class BrowserPool {
  constructor(maxSize = 2) {
    this.browsers = [];
    this.maxSize = maxSize;
    this.inUse = new Set();
  }

  async getBrowser() {
    // Cari browser yang tidak sedang digunakan
    const availableBrowser = this.browsers.find(browser => 
      !this.inUse.has(browser) && browser.isConnected()
    );

    if (availableBrowser) {
      this.inUse.add(availableBrowser);
      return availableBrowser;
    }

    // Jika tidak ada yang tersedia dan belum mencapai max, buat baru
    if (this.browsers.length < this.maxSize) {
      const browser = await this.createBrowser();
      this.browsers.push(browser);
      this.inUse.add(browser);
      return browser;
    }

    // Tunggu sampai ada yang tersedia
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.browsers.find(browser => 
          !this.inUse.has(browser) && browser.isConnected()
        );
        if (available) {
          clearInterval(checkInterval);
          this.inUse.add(available);
          resolve(available);
        }
      }, 100);
    });
  }

  async createBrowser() {
    return await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-web-security',
        '--memory-pressure-off',
        '--max_old_space_size=256',
        '--window-size=800,600'
      ],
      timeout: 30000,
      pipe: true
    });
  }

  releaseBrowser(browser) {
    this.inUse.delete(browser);
  }

  async cleanup() {
    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
    this.browsers = [];
    this.inUse.clear();
  }
}

const browserPool = new BrowserPool(2);

// **OPTIMIZATION 2: Request Rate Limiting**
const requestLimitMap = new Map();

function checkRateLimit(ip, limit = 10, window = 60000) {
  const now = Date.now();
  const requests = requestLimitMap.get(ip) || [];
  
  // Filter requests dalam window time
  const validRequests = requests.filter(time => now - time < window);
  
  if (validRequests.length >= limit) {
    return false;
  }
  
  validRequests.push(now);
  requestLimitMap.set(ip, validRequests);
  return true;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // **OPTIMIZATION 3: Limit payload size**
app.use(express.static(path.join(__dirname, 'public')));

// **OPTIMIZATION 4: Enhanced Security Headers**
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const reqPath = req.path;
  if (reqPath.endsWith('.js') || reqPath.endsWith('.html')) {
    const referer = req.headers.referer;
    if (!referer || !referer.includes(req.headers.host)) {
      return res.status(403).send('Akses ditolak.');
    }
  }
  
  next();
});

// **OPTIMIZATION 5: Rate limiting middleware**
app.use('/api', (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  if (!checkRateLimit(ip, 30, 60000)) { // 30 requests per minute
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Terlalu banyak permintaan. Silakan tunggu sebentar.'
    });
  }
  
  next();
});

// Serve main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// **OPTIMIZED Extract authorization token - Focus only on userCoupons**
app.post('/api/extract-token', async (req, res) => {
  const startTime = Date.now();
  let browser = null;
  let page = null;

  try {
    const { cocaColaLink } = req.body;
    
    if (!cocaColaLink || !cocaColaLink.includes('ayo.coca-cola.co.id')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid link', 
        message: 'Please provide a valid Coca-Cola link' 
      });
    }
    
    console.log(`Starting optimized userCoupons token extraction: ${cocaColaLink}`);
    
    // **OPTIMIZATION 6: Use browser pool**
    browser = await browserPool.getBrowser();
    page = await browser.newPage();
    
    // **OPTIMIZATION 7: Minimal page setup**
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Mobile Safari/537.36');
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    
    // **OPTIMIZATION 8: Block unnecessary resources**
    await page.setRequestInterception(true);
    
    let authToken = null;
    let userCouponsFound = false;
    
    page.on('request', request => {
      const url = request.url();
      const resourceType = request.resourceType();
      
      // Block unnecessary resources to improve performance
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        return request.abort();
      }
      
      // FOCUS ONLY ON userCoupons
      if (url.includes('userCoupons')) {
        console.log('Found userCoupons request:', url);
        const headers = request.headers();
        
        if (headers.authorization) {
          authToken = headers.authorization;
          userCouponsFound = true;
          console.log('Extracted authorization token from userCoupons');
        }
      }
      
      request.continue();
    });
    
    // **OPTIMIZATION 9: Shorter timeout and smarter waiting**
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout waiting for userCoupons')), 20000);
    });
    
    const extractionPromise = (async () => {
      await page.goto(cocaColaLink, { 
        waitUntil: 'domcontentloaded', // Faster than networkidle2
        timeout: 15000 
      });
      
      // Smart waiting: check every 200ms for userCoupons
      let attempts = 0;
      const maxAttempts = 50; // 10 seconds total
      
      while (!userCouponsFound && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if (!authToken) {
        // Minimal interaction if needed
        try {
          await page.evaluate(() => {
            // Trigger any potential lazy loading
            window.scrollTo(0, 200);
          });
          
          // Wait a bit more after interaction
          let extraAttempts = 0;
          while (!userCouponsFound && extraAttempts < 15) { // 3 more seconds
            await new Promise(resolve => setTimeout(resolve, 200));
            extraAttempts++;
          }
        } catch (e) {
          console.log('Interaction failed:', e.message);
        }
      }
      
      return authToken;
    })();
    
    const result = await Promise.race([extractionPromise, timeoutPromise]);
    
    if (!result) {
      console.log(`Failed to extract userCoupons token after ${Date.now() - startTime}ms`);
      return res.status(404).json({ 
        success: false, 
        error: 'Token not found', 
        message: 'Could not find userCoupons request. Link mungkin sudah kadaluarsa.' 
      });
    }
    
    console.log(`Successfully extracted token in ${Date.now() - startTime}ms`);
    return res.json({ 
      success: true, 
      token: result 
    });
    
  } catch (error) {
    console.error('Error extracting userCoupons token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  } finally {
    // **OPTIMIZATION 10: Proper cleanup**
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }
    }
    if (browser) {
      browserPool.releaseBrowser(browser);
    }
  }
});

// **OPTIMIZATION 11: Enhanced SSE with connection management**
const activeConnections = new Set();

app.get('/api/attempt-events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);
  
  const attemptHandler = (attempt) => {
    try {
      res.write(`data: ${JSON.stringify({ attempt })}\n\n`);
    } catch (error) {
      console.error('SSE write error:', error);
      activeConnections.delete(res);
      attemptEmitter.removeListener('attempt', attemptHandler);
    }
  };
  
  activeConnections.add(res);
  attemptEmitter.on('attempt', attemptHandler);
  
  // Handle client disconnect
  req.on('close', () => {
    activeConnections.delete(res);
    attemptEmitter.removeListener('attempt', attemptHandler);
  });
  
  req.on('error', () => {
    activeConnections.delete(res);
    attemptEmitter.removeListener('attempt', attemptHandler);
  });
});

// **OPTIMIZATION 12: Enhanced claim endpoint with better error handling**
app.post('/api/claim', async (req, res) => {
  try {
    const { packagingCode, authorization } = req.body;
    
    if (!packagingCode || !authorization) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required parameters',
        message: 'Kode kemasan dan authorization diperlukan'
      });
    }

    // **OPTIMIZATION 13: Input validation**
    if (packagingCode.length > 20 || !authorization.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'Format kode atau authorization tidak valid'
      });
    }

    const url = "https://api-v1.grivy.com/grabMainRedeem";
    
    const body = {
      data: {
        publicCode: "tccc-coke-utc-2025-main",
        packagingCode: packagingCode.trim(),
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

    const maxAttempts = 25;
    let attemptCount = 0;
    let success = false;
    let finalResult = null;
    
    // **OPTIMIZATION 14: Smarter retry logic with exponential backoff**
    const getDelay = (attempt) => {
      if (attempt <= 5) return 500; // Fast retries first
      if (attempt <= 15) return 1000; // Medium delay
      return 1500; // Longer delay for final attempts
    };
    
    while (attemptCount < maxAttempts && !success) {
      attemptCount++;
      
      // Emit attempt for SSE
      try {
        attemptEmitter.emit('attempt', attemptCount);
      } catch (sseError) {
        console.error('SSE emit error:', sseError);
      }
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per request
        
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, getDelay(attemptCount)));
          continue;
        }
        
        const result = await response.json();
        finalResult = result;
        
        if (result.error) {
          // Handle specific errors that should stop attempts
          const stopErrors = [
            'coupons_limit_daily',
            'packaging_code_not_found', 
            'packaging_code_used'
          ];
          
          if (stopErrors.includes(result.error.message)) {
            const statusMap = {
              'coupons_limit_daily': {
                status: 'LIMIT_REACHED',
                message: 'Coupons sudah limit, 1 akun hanya 3x redeem saja'
              },
              'packaging_code_not_found': {
                status: 'INVALID_CODE',
                message: 'Coupons tidak valid'
              },
              'packaging_code_used': {
                status: 'INVALID_ARGUMENT',
                message: 'Kode sudah digunakan'
              }
            };
            
            const errorInfo = statusMap[result.error.message];
            return res.json({
              success: false,
              status: errorInfo.status,
              message: errorInfo.message,
              attempts: attemptCount,
              result
            });
          }
          
          // For other errors, continue retrying
          await new Promise(resolve => setTimeout(resolve, getDelay(attemptCount)));
        } else {
          // Success!
          success = true;
          
          let parsedData = null;
          try {
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
        console.error(`Attempt ${attemptCount} failed:`, error.name, error.message);
        
        if (error.name === 'AbortError') {
          console.log(`Request ${attemptCount} timed out`);
        }
        
        await new Promise(resolve => setTimeout(resolve, getDelay(attemptCount)));
      }
    }
    
    return res.json({
      success: false,
      status: 'MAX_ATTEMPTS',
      message: `Mencapai batas maksimum ${maxAttempts} percobaan tanpa keberhasilan`,
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

// **OPTIMIZATION 15: Connection pooling for Supabase**
const supabaseCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

function getCachedQuery(key, queryFn) {
  const cached = supabaseCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }
  
  return queryFn().then(data => {
    supabaseCache.set(key, {
      data,
      timestamp: Date.now()
    });
    return data;
  });
}

// Serve claim page when a code is provided
app.get('/claim', (req, res) => {
  const accessCode = req.query.code;
  
  if (!accessCode) {
    return res.redirect('/');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'claim.html'));
});

// **OPTIMIZATION 16: Enhanced subscription check with caching**
app.post('/api/check-subscription', async (req, res) => {
  try {
    const { accessCode, deviceId } = req.body;
    
    if (!accessCode || !deviceId) {
      return res.status(400).json({
        valid: false,
        message: 'Access code and device ID are required'
      });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Subscription check - Device ID: ${deviceId.substring(0, 8)}... IP: ${ipAddress}`);
    
    // Try cache first
    const cacheKey = `sub_${accessCode}`;
    
    let subscription;
    try {
      const cached = supabaseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
        subscription = cached.data;
      } else {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('access_code', accessCode)
          .single();
        
        if (error || !data) {
          console.log(`Invalid subscription check - Code: ${accessCode}, IP: ${ipAddress}`);
          return res.status(404).json({
            valid: false,
            message: 'Invalid access code or subscription not found'
          });
        }
        
        subscription = data;
        supabaseCache.set(cacheKey, {
          data: subscription,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return res.status(500).json({
        valid: false,
        message: 'Error checking subscription'
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
    
    const thisDevice = devices.find(d => d.device_id === deviceId || d.ip_address === ipAddress);
    
    if (!thisDevice) {
      if (devices.length >= subscription.device_limit) {
        console.log(`Device limit reached - Code: ${accessCode}, IP: ${ipAddress}, Device ID: ${deviceId.substring(0, 8)}...`);
        return res.status(403).json({
          valid: false,
          message: `Device limit reached. This subscription can only be used on ${subscription.device_limit} devices.`
        });
      }
      
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
      const updates = {
        last_active: new Date().toISOString()
      };
      
      if (thisDevice.ip_address !== ipAddress) {
        updates.ip_address = ipAddress;
      }
      
      if (thisDevice.device_id !== deviceId) {
        updates.device_id = deviceId;
      }
      
      await supabase
        .from('devices')
        .update(updates)
        .eq('id', thisDevice.id);
        
      console.log(`Existing device updated - Code: ${accessCode}, IP: ${ipAddress}, Device ID: ${deviceId.substring(0, 8)}...`);
    }
    
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
     if (type === 'Lite') {
       // Untuk Lite: tambahkan tepat 1 hari
       expiryDate.setDate(expiryDate.getDate() + 1);
     } else if (type === 'Standard') {
       // Untuk Standard: tambahkan tepat 3 hari
       expiryDate.setDate(expiryDate.getDate() + 3);
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
   if (type === 'Lite') {
       // Untuk Lite: tambahkan tepat 1 hari
       expiryDate.setDate(expiryDate.getDate() + 1);
     } else if (type === 'Standard') {
       // Untuk Standard: tambahkan tepat 3 hari
       expiryDate.setDate(expiryDate.getDate() + 3);
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

// **OPTIMIZATION 17: Graceful shutdown**
process.on('SIGTERM', async () => {
 console.log('SIGTERM received, shutting down gracefully...');
 await browserPool.cleanup();
 
 // Close active SSE connections
 for (const connection of activeConnections) {
   try {
     connection.end();
   } catch (error) {
     console.error('Error closing SSE connection:', error);
   }
 }
 
 process.exit(0);
});

process.on('SIGINT', async () => {
 console.log('SIGINT received, shutting down gracefully...');
 await browserPool.cleanup();
 process.exit(0);
});

// **OPTIMIZATION 18: Health check endpoint**
app.get('/health', (req, res) => {
 res.json({
   status: 'healthy',
   timestamp: new Date().toISOString(),
   uptime: process.uptime(),
   browserPool: {
     total: browserPool.browsers.length,
     inUse: browserPool.inUse.size
   }
 });
});

// Start server
app.listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
 console.log(`Visit http://localhost:${PORT} to access the application`);
 console.log(`Health check available at http://localhost:${PORT}/health`);
});