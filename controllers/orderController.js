import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { stripe } from "../server.js";

// CREATE ORDERS
export const createOrderController = async (req, res) => {
  try {
    const {
      shippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemPrice,
      tax,
      shippingCharges,
      totalAmount,
    } = req.body;

    // Validate stock availability before creating order
    for (let i = 0; i < orderItems.length; i++) {
      const product = await productModel.findById(orderItems[i].product);
      if (!product) {
        return res.status(404).send({
          success: false,
          message: `Product not found: ${orderItems[i].product}`,
        });
      }

      if (product.stock < orderItems[i].quantity) {
        return res.status(400).send({
          success: false,
          message: `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${orderItems[i].quantity}`,
        });
      }
    }

    // Create order without decreasing stock yet
    const order = await orderModel.create({
      user: req.user._id,
      shippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemPrice,
      tax,
      shippingCharges,
      totalAmount,
    });
    // Decrease stock
    for (let i = 0; i < order.orderItems.length; i++) {
      const product = await productModel.findById(order.orderItems[i].product);
      product.stock -= order.orderItems[i].quantity;
      await product.save();
    }

    res.status(201).send({
      success: true,
      message: "Order Placed Successfully",
      orderId: order._id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Create Order API",
      error,
    });
  }
};

// GET ALL ORDERS - MY ORDERS
export const getMyOrdersCotroller = async (req, res) => {
  try {
    // find orders
    const orders = await orderModel.find({ user: req.user._id });
    //valdiation
    if (!orders) {
      return res.status(404).send({
        success: false,
        message: "no orders found",
      });
    }
    res.status(200).send({
      success: true,
      message: "your orders data",
      totalOrder: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In My orders Order API",
      error,
    });
  }
};

// GET SINGLE ORDER INFO
export const singleOrderDetrailsController = async (req, res) => {
  try {
    // find orders
    const order = await orderModel.findById(req.params.id);
    //valdiation
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "no order found",
      });
    }
    res.status(200).send({
      success: true,
      message: "your order fetched",
      order,
    });
  } catch (error) {
    console.log(error);
    // cast error ||  OBJECT ID
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Get UPDATE Products API",
      error,
    });
  }
};

// ACCEPT PAYMENTS
export const paymetsController = async (req, res) => {
  try {
    const { totalAmount, orderId } = req.body;

    // Validation
    if (!totalAmount) {
      return res.status(400).send({
        success: false,
        message: "Total Amount is required",
      });
    }
    if (!orderId) {
      return res.status(400).send({
        success: false,
        message: "Order ID is required",
      });
    }

    // Find the order
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    // Verify the order belongs to the user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).send({
        success: false,
        message: "You can only pay for your own orders",
      });
    }

    // Check if payment is already complete
    if (order.paymentStatus === "complete") {
      return res.status(400).send({
        success: false,
        message: "Payment already completed for this order",
      });
    }

    // Verify amount matches
    if (order.totalAmount !== totalAmount) {
      return res.status(400).send({
        success: false,
        message: "Amount doesn't match order total",
      });
    }

    // Create payment intent with order metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(totalAmount * 100),
      currency: "usd",
      metadata: {
        orderId: orderId,
        userId: req.user._id.toString(),
      },
    });

    // Update order with payment intent info
    order.paymentInfo = {
      id: paymentIntent.id,
      status: "created",
    };
    order.paymentStatus = "pending";
    await order.save();

    res.status(200).send({
      success: true,
      client_secret: paymentIntent.client_secret,
      orderId: orderId,
      paymentStatus: order.paymentStatus,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in payment API",
      error: error.message,
    });
  }
};

// UPDATE PAYMENT STATUS (called from frontend after successful payment)
export const updatePaymentStatusController = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    // Validation
    if (!orderId || !paymentIntentId) {
      return res.status(400).send({
        success: false,
        message: "Order ID and Payment Intent ID are required",
      });
    }

    // Find the order
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    // Verify the order belongs to the user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).send({
        success: false,
        message: "You can only update your own orders",
      });
    }

    // Verify payment intent matches
    if (order.paymentInfo.id !== paymentIntentId) {
      return res.status(400).send({
        success: false,
        message: "Payment intent ID doesn't match",
      });
    }

    // Check if payment is already complete
    if (order.paymentStatus === "complete") {
      return res.status(400).send({
        success: false,
        message: "Payment already completed for this order",
      });
    }

    // Validate stock availability before confirming payment
    for (let i = 0; i < order.orderItems.length; i++) {
      const product = await productModel.findById(order.orderItems[i].product);
      if (!product) {
        return res.status(404).send({
          success: false,
          message: `Product not found: ${order.orderItems[i].product}`,
        });
      }

      if (product.stock < order.orderItems[i].quantity) {
        return res.status(400).send({
          success: false,
          message: `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${order.orderItems[i].quantity}`,
        });
      }
    }

    // Update payment status
    order.paymentStatus = "complete";
    order.paidAt = new Date();
    order.paymentInfo.status = "succeeded";
    await order.save();

    res.status(200).send({
      success: true,
      message: "Payment status updated successfully",
      order: {
        _id: order._id,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt,
        totalAmount: order.totalAmount,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error updating payment status",
      error: error.message,
    });
  }
};

// ========== ADMIN SECTION =============

// GET ALL ORDERS
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.status(200).send({
      success: true,
      message: "All Orders Data",
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Get UPDATE Products API",
      error,
    });
  }
};

// CHANGE ORDER STATUS
export const changeOrderStatusController = async (req, res) => {
  try {
    // find order
    const order = await orderModel.findById(req.params.id);
    // validatiom
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "order not found",
      });
    }
    if (order.orderStatus === "processing") order.orderStatus = "shipped";
    else if (order.orderStatus === "shipped") {
      order.orderStatus = "delivered";
      order.deliveredAt = Date.now();
    } else {
      return res.status(500).send({
        success: false,
        message: "order already delivered",
      });
    }
    await order.save();
    res.status(200).send({
      success: true,
      message: "order status updated",
    });
  } catch (error) {
    console.log(error);
    // cast error ||  OBJECT ID
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Get UPDATE Products API",
      error,
    });
  }
};

export const cancelOrderController = async (req, res) => {
  try {
    //get order
    const order = await orderModel.findById(req.params.id);

    //validate
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "order not found",
      });
    }

    order.orderStatus = "cancel";
    order.cancelInfo.cancelAt = Date.now();
    order.cancelInfo.cancelReason = req.body.cancelReason;

    await order.save();
    res.status(200).send({
      success: true,
      message: "order canceled",
    });
  } catch (error) {
    console.log(error);
    // cast error ||  OBJECT ID
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Get CANCEL Products API",
      error,
    });
  }
};
