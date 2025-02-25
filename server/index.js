import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import { Agent } from 'https';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 5000;

// Simplified CORS configuration
const corsOptions = process.env.NODE_ENV === 'production' 
  ? {
      origin: [
        'https://fishing-forecast-seven.vercel.app',
        'https://fishing-forecast.vercel.app',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true
    }
  : {
      origin: true, // Allow all origins in development
      credentials: true
    };

app.use(cors(corsOptions));

// Trust first proxy if behind a reverse proxy
app.set('trust proxy', 1);

// Create a custom HTTPS agent with optimized settings
const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  timeout: 60000,
  maxSockets: 100,
  maxFreeSockets: 10,
  scheduling: 'lifo',
  rejectUnauthorized: true
});

// In-memory cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
           req.ip || 
           'unknown';
  }
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// Enhanced fetch with retries and timeouts
async function fetchWithRetry(url, options, retries = 3) {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        agent: httpsAgent,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Connection': 'keep-alive',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Check for OpenWeather API specific error format
      if (data.cod && data.cod !== 200 && data.cod !== '200') {
        throw new Error(data.message || `API Error: ${data.cod}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      lastError = error;
      
      if (i === retries - 1) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000))
      );
    }
  }

  throw lastError;
}

// Cache middleware
function cacheMiddleware(duration) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cachedResponse = apiCache.get(key);

    if (cachedResponse && Date.now() - cachedResponse.timestamp < duration) {
      return res.json(cachedResponse.data);
    }

    res.originalJson = res.json;
    res.json = (data) => {
      apiCache.set(key, {
        data,
        timestamp: Date.now()
      });
      res.originalJson(data);
    };
    next();
  };
}

// OpenWeather API endpoints
app.get('/api/weather/current', cacheMiddleware(CACHE_DURATION), async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }

    if (!process.env.VITE_OPENWEATHER_API_KEY) {
      return res.status(500).json({ error: 'OpenWeather API key not configured' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.VITE_OPENWEATHER_API_KEY}&units=imperial`;

    const data = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FishingConditionsApp/1.0'
      }
    });

    // Validate the response structure
    if (!data.main || !data.wind || !data.clouds) {
      throw new Error('Invalid weather data format received');
    }

    res.json(data);
  } catch (error) {
    console.error('Weather API error:', error);
    
    res.status(error.message.includes('401') ? 401 : 500).json({
      error: error.message || 'Failed to fetch weather data'
    });
  }
});

app.get('/api/weather/forecast', cacheMiddleware(CACHE_DURATION), async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }

    if (!process.env.VITE_OPENWEATHER_API_KEY) {
      return res.status(500).json({ error: 'OpenWeather API key not configured' });
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${process.env.VITE_OPENWEATHER_API_KEY}&units=imperial`;

    const data = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FishingConditionsApp/1.0'
      }
    });

    // Validate the response structure
    if (!data.list || !Array.isArray(data.list)) {
      throw new Error('Invalid forecast data format received');
    }

    res.json(data);
  } catch (error) {
    console.error('Weather API error:', error);
    
    res.status(error.message.includes('401') ? 401 : 500).json({
      error: error.message || 'Failed to fetch forecast data'
    });
  }
});

// Marine API endpoint
app.get('/api/marine', cacheMiddleware(CACHE_DURATION), async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }

    if (!process.env.VITE_MARINE_API_KEY) {
      return res.status(500).json({ error: 'Marine API key not configured' });
    }

    const coords = `${lat},${lon}`;
    const url = `https://api.worldweatheronline.com/premium/v1/marine.ashx?key=${process.env.VITE_MARINE_API_KEY}&q=${coords}&format=json&tide=yes&tp=1`;

    const data = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FishingConditionsApp/1.0'
      }
    });

    // Validate the response structure
    if (!data.data || !data.data.weather) {
      throw new Error('Invalid marine data format received');
    }

    res.json(data);
  } catch (error) {
    console.error('Marine API error:', error);
    
    res.status(error.message.includes('401') ? 401 : 500).json({
      error: error.message || 'Failed to fetch marine data'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});