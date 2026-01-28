import { supabase, supabaseAdmin } from './lib/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Supabase Integration Test Suite
 * This script verifies:
 * 1. Connection to Supabase
 * 2. Presence of required tables
 * 3. Basic CRUD operations
 * 4. RLS (Row Level Security) behaviors
 */

async function runTests() {
  console.log('🚀 Starting Supabase Integration Tests...\n');

  try {
    // 1. Connection Test
    console.log('--- Step 1: Connection Test ---');
    const { data: connData, error: connError } = await supabase.from('products').select('count', { count: 'exact', head: true }).limit(1);
    
    if (connError) {
      console.error('❌ Connection failed:', connError.message);
      if (connError.hint) console.log('💡 Hint:', connError.hint);
      return;
    }
    console.log('✅ Successfully connected to Supabase.\n');

    // 2. Table Verification
    console.log('--- Step 2: Table Verification ---');
    const tables = ['products', 'orders', 'order_items'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(0);
      if (error && error.code === '42P01') {
        console.error(`❌ Table "${table}" does not exist.`);
      } else if (error) {
        console.error(`⚠️ Error checking table "${table}":`, error.message);
      } else {
        console.log(`✅ Table "${table}" is present and accessible.`);
      }
    }
    console.log();

    // 3. CRUD Operations (using Admin client for setup/cleanup)
    console.log('--- Step 3: CRUD Operations ---');
    if (!supabaseAdmin) {
      console.warn('⚠️ Supabase Admin client not available. Skipping full CRUD test.');
    } else {
      const testProduct = {
        name: `Test Product ${Date.now()}`,
        description: 'Temporary test product',
        price: 99.99,
        category: 'Testing',
        stock: 50,
        image_url: 'https://example.com/test.jpg'
      };

      // Create
      console.log('Creating test product...');
      const { data: created, error: createError } = await supabaseAdmin
        .from('products')
        .insert(testProduct)
        .select()
        .single();
      
      if (createError) throw new Error(`Create failed: ${createError.message}`);
      const productId = created.id;
      console.log(`✅ Product created with ID: ${productId}`);

      // Read
      console.log('Reading test product...');
      const { data: read, error: readError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (readError) throw new Error(`Read failed: ${readError.message}`);
      console.log(`✅ Successfully read product: ${read.name}`);

      // Update
      console.log('Updating product price...');
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('products')
        .update({ price: 79.99 })
        .eq('id', productId)
        .select()
        .single();
      
      if (updateError) throw new Error(`Update failed: ${updateError.message}`);
      console.log(`✅ Price updated to: ${updated.price}`);

      // Delete
      console.log('Deleting test product...');
      const { error: deleteError } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
      console.log('✅ Product deleted successfully.\n');
    }

    // 4. RLS Policy Check
    console.log('--- Step 4: RLS Policy Check ---');
    console.log('Attempting unauthorized delete with anon key...');
    // Try to delete a random ID (or 0) using public client. 
    // This should usually be blocked if RLS is on and no "delete" policy exists for anon.
    const { error: rlsError } = await supabase
      .from('products')
      .delete()
      .eq('id', 0);
    
    if (rlsError) {
      console.log(`ℹ️ Operation status: ${rlsError.message} (Code: ${rlsError.code})`);
      console.log('✅ RLS seems active (or operation was correctly handled by policy).\n');
    } else {
      console.log('⚠️ Delete operation returned no error. Check if RLS is enabled/configured correctly if you expected failure.\n');
    }

    console.log('🎉 All tests completed.');

  } catch (err) {
    console.error('\n💥 Test suite crashed:', err.message);
  }
}

runTests();
