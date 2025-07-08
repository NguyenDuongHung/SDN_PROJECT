import userModel from "../models/userModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/features.js";
import { generateAndSendOTP } from "../utils/otpUtils.js";

export const requestRegisterController = async (req, res) => {
  try {
    console.log("req body", req.body);

    const { name, email, password} = req.body;
    // validation
    if (!name || !email || !password) {
      return res.status(500).send({
        success: false,
        message: "Please Provide All Fields",
      });
    }
    //check exisiting user
    const exisitingUSer = await userModel.findOne({ email });
    //validation
    if (exisitingUSer) {
      return res.status(500).send({
        success: false,
        message: "email already taken",
      });
    }
    const user = await userModel.create({
      name,
      email,
      password,
      registExpiry: Date.now() + 24 * 60 * 60 * 1000, //24h
    });
    const result = await generateAndSendOTP(user);
    if (!result.success) {
      return res.status(500).send({
        success: false,
        message: "Error sending otp",
        error: result.error,
      });
    }

    res.status(201).send({
      success: true,
      message:
        "Registeration Success, please verify by enter the OTP in 24h or the request will be cancel",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Register API",
      error,
    });
  }
};

export const verifyregisterController = async (req, res) => {
  try {
    const { email, otp } = req.body;
    //validation
    if (!email || !otp) {
      return res.status(500).send({
        success: false,
        message: "Please Add Email OR otp",
      });
    }

    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Incorect email or requesy are expire",
      });
    }
    console.log(!user, email, otp);

    //check for request
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Request are not found",
      });
    }

    //check status
    if (user.status == "verified") {
      return res.status(400).send({
        success: false,
        message: "verify process are complete, please login",
      });
    }

    //check OTP
    const isMatchOTP = await user.compareOTP(otp);
    if (!isMatchOTP) {
      return res.status(400).send({
        success: false,
        message: "Invalid OTP",
      });
    }
    user.status = "verified";
    user.otp = undefined;
    user.OTPExpiry = undefined;
    user.registExpiry = undefined;
    await user.save();
    res.status(201).send({
      success: true,
      message: "verify Success, please login",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Register API",
      error,
    });
  }
};

//LOGIN
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    //validation
    if (!email || !password) {
      return res.status(500).send({
        success: false,
        message: "Please Add Email OR Password",
      });
    }
    // check user
    const user = await userModel.findOne({ email });
    //user valdiation
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Incorrect email or password",
      });
    }
    //check verify
    if (user.status == "pending") {
      return res.status(500).send({
        success: false,
        message: "Account are NOT verify, please verify acount first",
      });
    }
    //check pass
    const isMatch = await user.comparePassword(password);
    //valdiation pass
    if (!isMatch) {
      return res.status(500).send({
        success: false,
        message: "Incorrect email or password",
      });
    }
    //teken
    const token = user.generateToken();

    res.status(200).send({
      success: true,
      message: "Login Successfully",
      token,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: "false",
      message: "Error In Login Api",
      error,
    });
  }
};

// GET USER PROFILE
export const getUserProfileController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    user.password = undefined;
    res.status(200).send({
      success: true,
      message: "USer Prfolie Fetched Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In PRofile API",
      error,
    });
  }
};

// LOGOUT
export const logoutController = async (req, res) => {
  try {
    res.status(200).send({
      success: true,
      message: "Logout Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Logout API",
      error,
    });
  }
};

// UPDATE USER PROFILE
export const updateProfileController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const { name, email, phone } = req.body;
    // validation + Update
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    //save user
    await user.save();
    res.status(200).send({
      success: true,
      message: "User Profile Updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In update profile API",
      error,
    });
  }
};

// update user passsword
export const udpatePasswordController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const { oldPassword, newPassword } = req.body;
    //valdiation
    if (!oldPassword || !newPassword) {
      return res.status(500).send({
        success: false,
        message: "Please provide old or new password",
      });
    }
    // old pass check
    const isMatch = await user.comparePassword(oldPassword);
    //validaytion
    if (!isMatch) {
      return res.status(500).send({
        success: false,
        message: "Invalid Old Password",
      });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).send({
      success: true,
      message: "Password Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In update password API",
      error,
    });
  }
};

/// Update user profile photo
export const updateProfilePicController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    // file get from client photo
    const file = getDataUri(req.file);
    // delete prev image
    await cloudinary.v2.uploader.destroy(user.profilePic.public_id);
    // update
    const cdb = await cloudinary.v2.uploader.upload(file.content);
    user.profilePic = {
      public_id: cdb.public_id,
      url: cdb.secure_url,
    };
    // save func
    await user.save();

    res.status(200).send({
      success: true,
      message: "profile picture updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In update profile pic API",
      error,
    });
  }
};

// Request OTP for password reset
export const requestPasswordResetController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .send({ success: false, message: "Email required" });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    const result = await generateAndSendOTP(user);
    if (!result.success) {
      return res.status(500).send({
        success: false,
        message: "Error sending otp",
        error: result.error,
      });
    }

    res.status(200).send({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ success: false, message: "Error sending OTP", error });
  }
};

// Reset password with OTP
export const passwordResetController = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .send({ success: false, message: "All fields required" });
    }

    const user = await userModel.findOne({ email: email });
    const isMatchOTP = await user.compareOTP(otp);

    if (
      !user ||
      !user.OTPExpiry ||
      user.OTPExpiry < Date.now() ||
      !isMatchOTP
    ) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid or expired OTP" });
    }
    user.password = newPassword;
    user.otp = undefined;
    user.OTPExpiry = undefined;
    await user.save();
    res
      .status(200)
      .send({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ success: false, message: "Error resetting password", error });
  }
};
