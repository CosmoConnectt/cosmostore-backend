import express from "express";
import { getUserOrders, createOrder, getOrderById } from "../controllers/order.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js"; // ✅ Correct Import

const router = express.Router();

router.get("/", protectRoute, getUserOrders);
router.post("/", protectRoute, createOrder);
router.get("/:id", protectRoute, getOrderById);

export default router;
