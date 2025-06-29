import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// USER AUTH
export const isAuth = async (req, res, next) => {
  try {
    // Check Authorization header only
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send({
        success: false,
        message: "Please provide Bearer token in Authorization header",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decodeData = JWT.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await userModel.findById(decodeData._id);
    if (!user) {
      return res.status(401).send({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Auth Error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).send({
        success: false,
        message: "Invalid token",
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).send({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(500).send({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
};

// ADMIN AUTH
export const isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(401).send({
        success: false,
        message: "Admin access required",
      });
    }
    next();
  } catch (error) {
    console.log("Admin Auth Error:", error);
    return res.status(500).send({
      success: false,
      message: "Admin authentication error",
      error: error.message,
    });
  }
};
