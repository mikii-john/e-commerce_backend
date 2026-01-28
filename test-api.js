/**
 * API Endpoint Test Suite
 * This script verifies the REST API endpoints are working correctly.
 * 
 * Pre-requisite: The server must be running (e.g., node server.js or npm run dev)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testEndpoints() {
  console.log(`🚀 Starting API Endpoint Tests against ${BASE_URL}...\n`);

  try {
    // 1. Health Check
    console.log('--- Step 1: GET /api/health ---');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.status === 'up') {
      console.log('✅ Health check passed.');
      console.log(`   Database: ${healthData.database.type} (${healthData.database.status})`);
    } else {
      console.error('❌ Health check failed:', healthData);
    }
    console.log();

    // 2. Get Products
    console.log('--- Step 2: GET /api/products ---');
    const prodRes = await fetch(`${BASE_URL}/api/products`);
    const prodData = await prodRes.json();
    if (prodRes.ok && Array.isArray(prodData.data)) {
      console.log(`✅ Successfully fetched ${prodData.data.length} products.`);
    } else {
      console.error('❌ Failed to fetch products:', prodData.message || prodRes.statusText);
    }
    console.log();

    // 3. Create Order (Success Case)
    console.log('--- Step 3: POST /api/orders (Success) ---');
    // First, get a valid product ID
    const productId = prodData.data && prodData.data.length > 0 ? prodData.data[0].id : 1;
    
    const orderPayload = {
      customer_email: 'test@example.com',
      items: [
        { product_id: productId, quantity: 1 }
      ]
    };

    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const orderData = await orderRes.json();
    
    if (orderRes.status === 201) {
      console.log('✅ Order created successfully.');
      console.log(`   Order ID: ${orderData.data.id}`);
    } else {
      console.error('❌ Order creation failed:', orderData.message || orderRes.statusText);
      if (orderData.error) console.log('   Error details:', orderData.error);
    }
    console.log();

    // 4. Create Order (Failure Case - Invalid Data)
    console.log('--- Step 4: POST /api/orders (Failure - Invalid Data) ---');
    const invalidPayload = { customer_email: 'invalid' }; // Missing items
    const failRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload)
    });
    
    if (failRes.status === 400) {
      console.log('✅ Correctly rejected invalid order with 400 Bad Request.');
    } else {
      console.error('⚠️ Unexpected response for invalid order:', failRes.status);
    }
    console.log();

    console.log('🎉 API tests completed.');

  } catch (err) {
    if (err.cause && err.cause.code === 'ECONNREFUSED') {
      console.error('\n❌ Connection Refused: Is the server running at', BASE_URL, '?');
    } else {
      console.error('\n💥 API test suite crashed:', err.message);
    }
  }
}

testEndpoints();
