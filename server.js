import express from "express";
import dotenv from "dotenv";
import cors from "cors"; // Import CORS
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import featuredRoutes from './routes/featured.route.js';
import orderRoutes from "./routes/order.route.js"; // ✅ Corrected for ESM




dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS to allow requests from different origins
app.use(cors({
  origin: "http://localhost:5173", // Allow requests from your frontend's URL
  methods: "GET,POST", // Allowed methods
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));

app.use(express.json({ limit: "10mb" })); // allows you to parse the body of the request
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use( "/api/featured", featuredRoutes);
 app.use("/api/orders", orderRoutes);




app.listen(PORT, () => {
  console.log("server is running on port http://localhost:" + PORT);
  connectDB();
});
