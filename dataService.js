import products, { orders as mockOrders } from './data.js';
import { supabase } from './lib/supabaseClient.js';

const USE_SUPABASE = process.env.USE_SUPABASE === 'true';

export const productService = {
  async getAll() {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    }
    return products;
  },

  async getById(id) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
    return products.find(p => p.id == id);
  },

  async getByCategory(category) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('category', category);
      if (error) throw error;
      return data;
    }
    return products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
};

export const orderService = {
  async getAll() {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)');
      if (error) throw error;
      return data;
    }
    return mockOrders;
  },

  async getById(id) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
    return mockOrders.find(o => o.id == id);
  },

  async create(orderData) {
    if (USE_SUPABASE) {
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

      // Ideally update stock here too (RPC recommended for atomicity)
      
      return { ...order, items: validatedItems };
    }

    // Mock implementation
    const newOrder = {
      id: mockOrders.length + 1,
      order_number: `ORD-MOCK-${Date.now()}`,
      ...orderData,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    mockOrders.push(newOrder);
    return newOrder;
  }
};
