import { supabase } from './lib/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

export const productService = {
  async getAll() {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
      console.log('[DEBUG] Attempting Supabase query...');
      try {
        const { data, error } = await supabase.from('products').select('*');
        console.log('[DEBUG] Query completed. Error:', error?.message || 'none');
        console.log('[DEBUG] Data received:', data?.length || 0, 'items');
        
        if (error) {
          console.error('[ERROR] Supabase query failed:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          throw error; // Don't silently fail
        }
        
        if (data && data.length > 0) {
          console.log('[SUCCESS] Returning Supabase data. First ID:', data[0].id);
          return data;
        }
        throw new Error('Supabase returned empty array');
      } catch (err) {
        console.error('[ERROR] Unexpected error in productService.getAll():', err.message);
        throw err;
      }
  },

  async getById(id) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error(`❌ Supabase error fetching product ${id}:`, error.message);
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.error(`❌ Unexpected error fetching product ${id}:`, err.message);
      throw err;
    }
  },

  async getByCategory(category) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('category', category);
      if (error) {
        console.error(`❌ Supabase error fetching category ${category}:`, error.message);
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error(`❌ Unexpected error fetching category ${category}:`, err.message);
      throw err;
    }
  }
};

export const orderService = {
  async getAll() {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)');
      if (error) {
        console.error('❌ Supabase error fetching orders:', error.message);
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error('❌ Unexpected error fetching orders:', err.message);
      throw err;
    }
  },

  async getById(id) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .single();
      if (error) {
        console.error(`❌ Supabase error fetching order ${id}:`, error.message);
        throw error;
      }
      return data;
    } catch (err) {
      console.error(`❌ Unexpected error fetching order ${id}:`, err.message);
      throw err;
    }
  },

  async create(orderData) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    try {
      const { customer_email, items } = orderData;
      
      // Calculate total
      let total = 0;
      const validatedItems = [];
      
      for (const item of items) {
        const { data: product } = await supabase.from('products').select('*').eq('id', item.product_id).single();
        if (!product || product.stock < item.quantity) {
          throw new Error(`Insufficient stock or product not found: ${item.product_id}`);
        }
        total += product.price * item.quantity;
        validatedItems.push({ ...item, price: product.price, name: product.name });
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: `ORD-${Date.now()}`,
          customer_email,
          total_amount: parseFloat(total.toFixed(2)),
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert items
      const itemInserts = validatedItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemInserts);
      if (itemsError) throw itemsError;

      return { ...order, items: validatedItems };
    } catch (err) {
      console.error('❌ Supabase order creation failed:', err.message);
      throw err;
    }
  }
};
