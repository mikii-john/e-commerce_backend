# Testing Guide

This project includes a test suite to verify the Supabase integration and the REST API endpoints.

## 1. Supabase Integration Test

Verifies direct connection to Supabase, table presence, CRUD operations, and RLS policies.

**Run command:**

```bash
node test-supabase.js
```

### What it tests:

- **Connectivity**: Ensures `.env` credentials are correct.
- **Tables**: Verifies `products`, `orders`, and `order_items` exist.
- **CRUD**: Creates, reads, updates, and deletes a test product (requires `SUPABASE_SERVICE_ROLE_KEY`).
- **RLS**: Performs an unauthorized check to verify security policies.

---

## 2. API Endpoint Test

Verifies the Express server endpoints and their interaction with the database.

**Run command:**

1. Start the server (in one terminal):
   ```bash
   $env:USE_SUPABASE='true'; node server.js
   ```
2. Run the tests (in another terminal):
   ```bash
   node test-api.js
   ```

### What it tests:

- **GET /api/health**: Checks system health and DB latency.
- **GET /api/products**: Verifies product listing.
- **POST /api/orders**: Tests successful order creation and error handling for invalid input.

---

## 3. Troubleshooting

### Connection Issues

- **Error: `Supabase credentials are missing`**: Check your `.env` file for `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- **Error: `ECONNREFUSED`**: Ensure the Express server is running before running `test-api.js`.

### RLS Problems

- If `test-supabase.js` reports that a delete operation succeeded when it should have failed, ensure RLS is enabled on the `products` table in the Supabase Dashboard.
- Ensure you have not accidentally given `anon` role full delete permissions.

### Admin Privileges

- CRUD tests in `test-supabase.js` require the `SUPABASE_SERVICE_ROLE_KEY`. If it's missing, those tests will be skipped.
