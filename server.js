const express = require('express');
const path = require('path');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
          return res.json({
            success: true,
            attempts: attemptCount,
            result
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});
