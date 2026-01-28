import express from 'express';
import cors from 'cors';
import products from './data.js';

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// GET /products - returns the full list of products
app.get('/products', (req, res) => {
  res.status(200).json(products);
});

// GET /products/:id - returns a single product by its ID
app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  const product = products.find(p => p.id === parseInt(id));

  if (product) {
    res.status(200).json(product);
  } else {
    res.status(404).json({ message: "Product not found" });
  }
});

// POST /orders - accepts order data and logs it
app.post('/orders', (req, res) => {
  const { user_id, items } = req.body;

  if (!user_id || !items) {
    return res.status(400).json({ message: "Invalid order data" });
  }

  console.log(`Order received for user ${user_id}`);
  
  res.status(201).json({
    message: "Order placed successfully!",
    order: {
      user_id,
      items,
      status: "pending"
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
