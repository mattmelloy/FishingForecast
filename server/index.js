import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import https from 'https';
import { Agent } from 'https';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 5000;

// Configure CORS with specific origins
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://fishing-forecast-seven.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// Rate limiting with more lenient settings for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  },
  keyGenerator: (req) => {
    return process.env.NODE_ENV === 'development' 
      ? '127.0.0.1' 
      : req.ip || req.connection.remoteAddress;
  }
});

// Apply rate limiting to API routes only
app.use('/api', limiter);

// Enhanced fetch with retries and circuit breaker
const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
  threshold: 5,
  resetTimeout: 30000 // 30 seconds
};

async function fetchWithRetry(url, options, retries = 3) {
  // Check circuit breaker
  if (circuitBreaker.isOpen) {
    const now = Date.now();
    if (now - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
    } else {
      throw new Error('Circuit breaker is open');
    }
  }

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

      if (controller.signal.aborted) {
        throw new Error('Request timed out');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Reset circuit breaker on success
      circuitBreaker.failures = 0;
      circuitBreaker.isOpen = false;

      return { response, data };
    } catch (error) {
      lastError = error;
      
      // Update circuit breaker
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = Date.now();
      if (circuitBreaker.failures >= circuitBreaker.threshold) {
        circuitBreaker.isOpen = true;
        throw new Error('Circuit breaker triggered');
      }

      const isLastAttempt = i === retries - 1;
      const isNetworkError = error.code === 'ECONNRESET' || 
                            error.code === 'ECONNREFUSED' ||
                            error.code === 'ETIMEDOUT';

      if (isLastAttempt) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, i) + Math.random() * 1000, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      if (isNetworkError) {
        console.warn(`Network error (${error.code}), retrying...`);
      }
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

// Marine API endpoint with caching
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

    const { data } = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FishingConditionsApp/1.0'
      }
    });

    if (!data?.data?.weather) {
      throw new Error('Invalid response format from Marine API');
    }

    res.json(data);
  } catch (error) {
    console.error('Marine API error:', {
      message: error.message,
      code: error.code,
      type: error.name
    });
    
    let statusCode = 500;
    let errorResponse = {
      error: 'Failed to fetch marine data',
      retry: true
    };

    if (error.message === 'Circuit breaker is open') {
      statusCode = 503;
      errorResponse.error = 'Service temporarily unavailable';
      errorResponse.retryAfter = Math.ceil(circuitBreaker.resetTimeout / 1000);
    } else if (error.name === 'AbortError') {
      statusCode = 504;
      errorResponse.error = 'Request timed out';
    } else if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      statusCode = 503;
      errorResponse.error = 'Connection failed';
    }

    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
    }

    res.status(statusCode).json(errorResponse);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date(),
    circuitBreaker: {
      status: circuitBreaker.isOpen ? 'open' : 'closed',
      failures: circuitBreaker.failures
    }
  };
  res.json(health);
});

// Development proxy
if (process.env.NODE_ENV !== 'production') {
  app.get('*', (req, res) => {
    res.redirect(`http://localhost:5173${req.path}`);
  });
} else {
  app.use(express.static(join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});