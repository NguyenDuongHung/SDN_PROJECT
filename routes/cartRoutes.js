import express from "express";
import {
  addToCartController,
  viewCartController,
  updateCartItemController,
  removeFromCartController,
  clearCartController,
} from "../controllers/cartController.js";
import { isAuth } from "../middlewares/authMiddleware.js";
import { rateLimit } from "express-rate-limit";

// RATE LIMITER
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

//router object
const router = express.Router();

//routes
// Add item to cart
router.post("/add", limiter, isAuth, addToCartController);

// View cart items
router.get("/view", limiter, isAuth, viewCartController);

// Update cart item quantity
router.put("/update", limiter, isAuth, updateCartItemController);

// Remove item from cart
router.delete("/remove/", limiter, isAuth, removeFromCartController);

// Clear cart
router.delete("/clear", limiter, isAuth, clearCartController);

//export
export default router;
