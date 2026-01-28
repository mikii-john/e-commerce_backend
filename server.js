import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// --- PRODUCT ROUTES ---

// GET /api/products - returns all products from Supabase
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*');

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products from Supabase",
      error: error.message
    });
  }
});

// GET /api/products/:id - returns a single product by its ID from Supabase
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      res.status(200).json({
        success: true,
        data: data
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching the product",
      error: error.message
    });
  }
});

// GET /api/products/category/:category - Filters by category in Supabase
app.get('/api/products/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('category', category);

    if (error) throw error;

    if (data.length > 0) {
      res.status(200).json({
        success: true,
        data: data
      });
    } else {
      res.status(404).json({
        success: false,
        message: `No products found in category: ${category}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error filtering products",
      error: error.message
    });
  }
});

// --- ORDER ROUTES ---

// GET /api/orders - Returns all orders with items (Admin only)
app.get('/api/orders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message
    });
  }
});

// POST /api/orders - Creates a new order in Supabase
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_email, items } = req.body;

    if (!customer_email || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order data."
      });
    }

    let total_amount = 0;
    const validatedItems = [];

    // 1. Validate items and stock
    for (const item of items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', item.product_id)
        .single();

      if (error || !product) {
        return res.status(404).json({ success: false, message: `Product ${item.product_id} not found.` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}.` });
      }

      total_amount += product.price * item.quantity;
      validatedItems.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
    }

    // 2. Create Order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: `ORD-${Date.now()}`,
        customer_email,
        total_amount: parseFloat(total_amount.toFixed(2)),
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Create Order Items and Update Stock
    for (const item of validatedItems) {
      // Add to order_items
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        });
      
      if (itemError) throw itemError;

      // Update product stock
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: supabase.rpc('decrement', { x: item.quantity, row_id: item.product_id }) }) // Note: You might need a function for atomic decrement
        .eq('id', item.product_id);
      
      // Simpler way for mock:
      const { data: currentProd } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
      await supabase.from('products').update({ stock: currentProd.stock - item.quantity }).eq('id', item.product_id);
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      data: { ...order, items: validatedItems }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error processing the order",
      error: error.message
    });
  }
});

// GET /api/orders/:id - Get specific order from Supabase
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (data) {
      res.status(200).json({
        success: true,
        data: data
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching the order",
      error: error.message
    });
  }
});

// PATCH /api/orders/:id/status - Update status in Supabase
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('orders')
      .update({ status: status.toLowerCase() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
