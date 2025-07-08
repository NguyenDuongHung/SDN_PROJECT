import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name is required"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: [true, "email already taken"],
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minLength: [6, "password length should be greadter then 6 character"],
    },
    phone: {
      type: String,
    },
    profilePic: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    role: {
      type: String,
      default: "user",
    },
    status: {
      type: String,
      enum: ["pending", "verified"],
      default: "pending",
    },
    otp: {
      type: String,
    },
    OTPExpiry: {
      type: Date,
    },
    registExpiry: {
      type: Date,
      expires: 0, //delete doc when otp time run out
    },
  },
  { timestamps: true }
);

//fuynctuions
// hash func
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  if (!this.otp) return next();
  this.otp = await bcrypt.hash(this.otp, 10);
});

// compare function
userSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

// compare function
userSchema.methods.compareOTP = async function (OTP) {
  return await bcrypt.compare(OTP, this.otp);
};

//JWT TOKEN
userSchema.methods.generateToken = function () {
  return JWT.sign({ _id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const userModel = mongoose.model("Users", userSchema);
export default userModel;
