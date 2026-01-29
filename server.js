import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { productService, orderService } from './dataService.js';
import { supabase, testConnection } from './lib/supabaseClient.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());

// --- STARTUP CHECKS ---
testConnection().then(connected => {
  if (!connected) {
    console.warn('⚠️  Supabase connection failed. Server will continue but Supabase-dependent features may fail.');
  }
});

// Routes

// --- PRODUCT ROUTES ---

app.get('/api/products', async (req, res) => {
  try {
    const data = await productService.getAll();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching products", error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await productService.getById(id);
    if (data) {
      res.status(200).json({ success: true, data });
    } else {
      res.status(404).json({ success: false, message: `Product with ID ${id} not found` });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching the product", error: error.message });
  }
});

app.get('/api/products/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const data = await productService.getByCategory(category);
    if (data && data.length > 0) {
      res.status(200).json({ success: true, data });
    } else {
      res.status(404).json({ success: false, message: `No products found in category: ${category}` });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error filtering products", error: error.message });
  }
});

// --- ORDER ROUTES ---

app.get('/api/orders', async (req, res) => {
  try {
    const data = await orderService.getAll();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching orders", error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer_email, items } = req.body;
    if (!customer_email || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid order data." });
    }

    const order = await orderService.create({ customer_email, items });
    res.status(201).json({ success: true, message: "Order placed successfully!", data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error processing the order", error: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await orderService.getById(id);
    if (data) {
      res.status(200).json({ success: true, data });
    } else {
      res.status(404).json({ success: false, message: "Order not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching the order", error: error.message });
  }
});

// --- HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
  try {
    const start = Date.now();
    let dbStatus = 'disconnected';
    let dbDetails = {};

    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true }).limit(1);
    if (!error) {
      dbStatus = 'connected';
      dbDetails = { latency: `${Date.now() - start}ms` };
    } else {
      dbStatus = 'error';
      dbDetails = { error: error.message };
    }

    res.status(200).json({
      status: 'up',
      timestamp: new Date().toISOString(),
      database: {
        type: 'supabase',
        status: dbStatus,
        ...dbDetails
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ status: 'down', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
