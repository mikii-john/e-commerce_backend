import products from '../data.js';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  console.log('🚀 Starting migration...');

  if (!supabaseAdmin) {
    console.error('❌ Supabase Admin client not initialized. Check your SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  for (const product of products) {
    console.log(`📦 Migrating product: ${product.name}...`);
    
    // Remove ID if you want Supabase to generate it, 
    // or keep it if you want to preserve IDs.
    const { id, ...productData } = product;

    const { data, error } = await supabaseAdmin
      .from('products')
      .upsert({ id, ...productData }, { onConflict: 'id' })
      .select();

    if (error) {
      console.error(`❌ Failed to migrate ${product.name}:`, error.message);
    } else {
      console.log(`✅ Successfully migrated ${product.name}`);
    }
  }

  console.log('🏁 Migration finished.');
}

migrate();
