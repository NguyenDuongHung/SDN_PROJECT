import cartModel from "../models/cartModel.js";
import productModel from "../models/productModel.js";

// Add item to cart
export const addToCartController = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user._id;

    // Validation
    if (!productId) {
      return res.status(400).send({
        success: false,
        message: "Product ID is required",
      });
    }

    if (quantity < 1) {
      return res.status(400).send({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // Check if product exists
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product is in stock
    if (product.stock < quantity) {
      return res.status(400).send({
        success: false,
        message: "Insufficient stock",
      });
    }

    // Find or create cart for user
    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      // Create new cart
      cart = new cartModel({
        user: userId,
        items: [{
          product: productId,
          quantity: quantity,
          price: product.price
        }]
      });
    } else {
      // Check if product already exists in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (existingItemIndex > -1) {
        // Update quantity if product already exists
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        
        // Check stock again for updated quantity
        if (product.stock < newQuantity) {
          return res.status(400).send({
            success: false,
            message: "Insufficient stock for requested quantity",
          });
        }
        
        cart.items[existingItemIndex].quantity = newQuantity;
      } else {
        // Add new item to cart
        cart.items.push({
          product: productId,
          quantity: quantity,
          price: product.price
        });
      }
    }

    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images stock'
    });

    res.status(200).send({
      success: true,
      message: "Item added to cart successfully",
      cart,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in add to cart API",
      error: error.message,
    });
  }
};

// View cart items
export const viewCartController = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find cart for user
    const cart = await cartModel.findOne({ user: userId }).populate({
      path: 'items.product',
      select: 'name price images stock description'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(200).send({
        success: true,
        message: "Cart is empty",
        cart: {
          items: [],
          totalAmount: 0
        },
      });
    }

    res.status(200).send({
      success: true,
      message: "Cart retrieved successfully",
      cart,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in view cart API",
      error: error.message,
    });
  }
};

// Update cart item quantity
export const updateCartItemController = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    // Validation
    if (!productId || !quantity) {
      return res.status(400).send({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    if (quantity < 1) {
      return res.status(400).send({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // Check if product exists and has sufficient stock
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).send({
        success: false,
        message: "Insufficient stock",
      });
    }

    // Find cart and update item
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).send({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).send({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images stock'
    });

    res.status(200).send({
      success: true,
      message: "Cart item updated successfully",
      cart,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in update cart item API",
      error: error.message,
    });
  }
};

// Remove item from cart
export const removeFromCartController = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    // Validation
    if (!productId) {
      return res.status(400).send({
        success: false,
        message: "Product ID is required",
      });
    }

    // Find cart and remove item
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).send({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).send({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Remove item
    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images stock'
    });

    res.status(200).send({
      success: true,
      message: "Item removed from cart successfully",
      cart,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in remove from cart API",
      error: error.message,
    });
  }
};

// Clear cart
export const clearCartController = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find cart and clear items
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).send({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).send({
      success: true,
      message: "Cart cleared successfully",
      cart,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in clear cart API",
      error: error.message,
    });
  }
}; 