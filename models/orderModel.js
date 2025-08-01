import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    shippingInfo: {
      address: {
        type: String,
        required: [true, "address is required"],
      },
      city: {
        type: String,
        required: [true, "city name is required"],
      },
      country: {
        type: String,
        required: [true, " country name is require"],
      },
      phone: {
        type: String,
        required: [true, "phone number is required"],
      },
    },
    orderItems: [
      {
        name: {
          type: String,
          required: [true, "product name is require"],
        },
        price: {
          type: Number,
          required: [true, "product price is require"],
        },
        quantity: {
          type: Number,
          required: [true, "product quantity is require"],
        },
        image: {
          type: String,
          required: [true, "product image is require"], //img url from cloudinary take from product api
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: true,
        },
      },
    ],
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "user id is require"],
    },
    paidAt: Date,
    paymentInfo: {
      id: String,
      status: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "complete"],
      default: "pending",
    },
    itemPrice: {
      type: Number,
      required: [true, "item price is require"],
    },
    tax: {
      type: Number,
      required: [true, "tax price is require"],
    },
    shippingCharges: {
      type: Number,
      required: [true, "item shippingCharges  is require"],
    },
    totalAmount: {
      type: Number,
      required: [true, "item totalAmount price is require"],
    },
    orderStatus: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancel"],
      default: "processing",
    },
    deliveredAt: Date,
    cancelInfo: {
      cancelAt: Date,
      cancelReason: { type: String },
    },
  },
  { timestamps: true }
);

export const orderModel = mongoose.model("Orders", orderSchema);
export default orderModel;
