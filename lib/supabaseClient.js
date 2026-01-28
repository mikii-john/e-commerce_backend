import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials (URL/ANON_KEY) are missing in .env file.');
}

// 1. Create and export clients
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey) 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

if (!supabaseAdmin) {
  console.warn('Supabase Admin client not initialized: SUPABASE_SERVICE_ROLE_KEY is missing.');
}

/**
 * 2. Connection Testing & Error Handling
 */

/**
 * Test the connection to Supabase on startup.
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('_dummy_check').select('count', { count: 'exact', head: true }).limit(0);
    
    // Note: If the table doesn't exist, Supabase might return a 404 or similar. 
    // We just want to see if we can reach the API.
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      throw error;
    }
    
    console.log('✅ Supabase connection successful.');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

/**
 * Retry logic for failed queries.
 * @param {Function} queryFn - Function that returns a Supabase query promise.
 * @param {number} retries - Number of retries (default 3).
 * @param {number} delay - Delay between retries in ms (default 1000).
 */
export async function withRetry(queryFn, retries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const result = await queryFn();
      if (result.error) throw result.error;
      return result;
    } catch (error) {
      lastError = error;
      // Don't retry on certain errors (e.g., 404, constraint violations)
      if (['PGRST116', '23505', '23503'].includes(error.code)) {
        throw error;
      }
      console.warn(`Query failed (attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  return { data: null, error: lastError };
}

/**
 * 3. Helper Functions
 */

/**
 * Converts Supabase responses to a consistent format.
 */
export function formatResponse(data, error = null) {
  if (error) {
    return {
      success: false,
      data: null,
      error: handleSupabaseError(error),
    };
  }
  return {
    success: true,
    data,
    error: null,
  };
}

/**
 * Handles common Supabase/PostgREST errors.
 */
export function handleSupabaseError(error) {
  const code = error.code || 'UNKNOWN_ERROR';
  let message = error.message || 'An unexpected error occurred.';

  switch (code) {
    case 'PGRST116':
      message = 'Record not found.';
      break;
    case '23505':
      message = 'Duplicate entry found (unique constraint violation).';
      break;
    case '23503':
      message = 'Reference error (foreign key constraint violation).';
      break;
    case '42P01':
      message = 'Database table not found.';
      break;
  }

  return { code, message, originalError: error };
}

/**
 * Transaction Helper
 * Supabase doesn't support complex transactions via the JS client easily 
 * (unless using RPC). This helper allows chaining operations if needed,
 * or serves as a placeholder for RPC calls.
 */
export async function runTransaction(operations) {
  // Simplistic implementation: run sequentially, stop on error.
  // Real transactions should be handled via PostgreSQL Functions (RPC).
  const results = [];
  for (const op of operations) {
    const { data, error } = await op();
    if (error) {
      console.error('Transaction failed at operation:', error);
      return { success: false, error: handleSupabaseError(error), completed: results };
    }
    results.push(data);
  }
  return { success: true, data: results };
}

// Auto-test connection on startup (optional, depending on project style)
// if (process.env.NODE_ENV !== 'test') {
//   testConnection();
// }
