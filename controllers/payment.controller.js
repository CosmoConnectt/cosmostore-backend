import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";

export const createCheckoutSession = async (req, res) => {
    try {
        const { products, couponCode } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "Invalid or empty products array" });
        }

        let totalAmount = 0;

        const lineItems = products.map((product) => {
            const amount = Math.round(product.price * 100);
            totalAmount += amount * product.quantity;

            return {
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: product.name,
                        images: [product.image],
                    },
                    unit_amount: amount,
                },
                quantity: product.quantity || 1,
            };
        });

        let coupon = null;
        if (couponCode) {
            coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
            if (coupon) {
                totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
            }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
            metadata: {
                userId: req.user._id.toString(),
                couponCode: couponCode || "",
                products: JSON.stringify(
                    products.map((p) => ({
                        id: p._id,
                        quantity: p.quantity,
                        price: p.price,
                    }))
                ),
            },
        });

        if (totalAmount >= 2000) {
            await createNewCoupon(req.user._id);
        }

        res.status(200).json({ id: session.id, totalAmount });
    } catch (error) {
        console.error("Error processing checkout:", error);
        res.status(500).json({ message: "Error processing checkout", error: error.message });
    }
};

export const checkoutSuccess = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);

        if (paymentIntent.status === "succeeded") {
            const existingOrder = await Order.findOne({ stripeSessionId: sessionId });

            if (existingOrder) {
                // Update paymentStatus if it's still pending
                if (existingOrder.paymentStatus === "pending") {
                    existingOrder.paymentStatus = "completed";
                    await existingOrder.save();
                }

                return res.status(200).json({
                    success: true,
                    message: "Order already processed.",
                    orderId: existingOrder._id,
                });
            }

            if (session.metadata.couponCode) {
                await Coupon.findOneAndUpdate(
                    { code: session.metadata.couponCode, userId: session.metadata.userId },
                    { isActive: false }
                );
            }

            const products = JSON.parse(session.metadata.products);
            const newOrder = new Order({
                user: session.metadata.userId,
                products: products.map((product) => ({
                    product: product.id,
                    quantity: product.quantity,
                    price: product.price,
                })),
                totalAmount: session.amount_total / 100,
                stripeSessionId: sessionId,
                paymentMethod: "Stripe",
                paymentStatus: "completed",  // Ensure payment status is set to completed
                status: "completed",
            });

            await newOrder.save();

            res.status(200).json({
                success: true,
                message: "Payment successful, order created.",
                orderId: newOrder._id,
            });
        } else {
            res.status(400).json({ message: "Payment not successful." });
        }
    } catch (error) {
        console.error("Error processing successful checkout:", error);
        res.status(500).json({ message: "Error processing successful checkout", error: error.message });
    }
};


export const cashOnDelivery = async (req, res) => {
    try {
        const { products, couponCode } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "Invalid or empty products array" });
        }

        let totalAmount = products.reduce((acc, product) => acc + product.price * product.quantity, 0);

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
            if (coupon) {
                totalAmount -= (totalAmount * coupon.discountPercentage) / 100;
                await Coupon.findOneAndUpdate(
                    { code: couponCode, userId: req.user._id },
                    { isActive: false }
                );
            }
        }

        const newOrder = new Order({
            user: req.user._id,
            products: products.map((product) => ({
                product: product._id,
                quantity: product.quantity,
                price: product.price,
            })),
            totalAmount,
            paymentMethod: "Cash on Delivery",
            status: "pending",
            stripeSessionId: `COD-${new Date().getTime()}`  // Adding a unique identifier for COD
        });
        

        await newOrder.save();

        res.status(200).json({
            success: true,
            message: "Order placed successfully with Cash on Delivery.",
            orderId: newOrder._id,
        });
    } catch (error) {
        console.error("Error processing cash on delivery:", error);
        res.status(500).json({ message: "Error processing cash on delivery", error: error.message });
    }
};

async function createNewCoupon(userId) {
    await Coupon.findOneAndDelete({ userId });

    const newCoupon = new Coupon({
        code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
        discountPercentage: 10,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userId,
    });

    await newCoupon.save();
    return newCoupon;
}
