import express from 'express';
const router = express.Router();
import Product from '../models/product.model.js'; // Assuming you have a product model

router.get('/featured', async (req, res) => {
  try {
    const featuredProducts = await Product.find({ isFeatured: true });
    res.json(featuredProducts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

export default router;
