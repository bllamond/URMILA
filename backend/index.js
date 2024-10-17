const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const crypto = require("crypto");

const app = express();

app.use(express.json());
app.use(cors());
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

const mongoURI =
  "mongodb+srv://vinaymalik1729:2QVRcNSMZAqAvS4s@cluster0.boree.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

const bcrypt = require("bcryptjs");
const User = require("./models/User");
const authenticateToken = require("./middlewares/auth");

const nodemailer = require("nodemailer");

app.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, occupation, institution } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      occupation,
      institution,
      otp,
      isVerified: false,
    });

    try {
      await newUser.save();
    } catch (error) {
      console.error("Error saving user:", error);
      return res.status(500).json({ msg: "Error saving user" });
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification OTP",
      html: `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px; background-color: #f9f9f9;">
    <h2 style="color: #333;">Welcome!</h2>
    <p style="color: #555;">Thank you for signing up. Please verify your email address to activate your account.</p>
    <p style="color: #333; font-size: 20px; font-weight: bold;">Your OTP for email verification is:</p>
    <h3 style="color: #007BFF; font-size: 24px; font-weight: bold;">${otp}</h3>
    <p style="color: #555;">Enter this code in the verification page to complete your registration.</p>
    <p style="color: #555;">If you did not request this, please ignore this email.</p>
    <p style="color: #555;">Thank you,<br>URMILA</p>
  </div>
`,
    });

    res
      .status(201)
      .json({
        msg: "OTP sent to your email. Please check your email to verify.",
      });
  } catch (error) {
    res.status(500).json({ msg: "Error registering user" });
  }
});

app.post("/complete-registration", authenticateToken, async (req, res) => {
  const { mobileNumber, currentOccupation, instituteOrOrganizationName } =
    req.body;
  console.log("hello");
  // Validate input
  if (!mobileNumber && !currentOccupation && !instituteOrOrganizationName) {
    return res.status(400).json({ msg: "At least one field is required." });
  }

  try {
    // Get user ID from authenticated token
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }
    console.log(user);
    // Update user fields
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (currentOccupation) user.currentOccupation = currentOccupation;
    if (instituteOrOrganizationName)
      user.instituteOrOrganizationName = instituteOrOrganizationName;

    await user.save();

    return res
      .status(200)
      .json({ msg: "Registration completed successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Server error." });
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // Check if the OTP matches
    if (user.otp === otp) {
      user.isVerified = true;
      await user.save();

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({ msg: "Email verified successfully", token });
    } else {
      res.status(400).json({ msg: "Invalid OTP. Please try again." });
    }
  } catch (error) {
    res.status(500).json({ msg: "Error verifying OTP" });
  }
});


app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "No user found with this email." });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour

    await user.save();

    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
        }
        h1 {
            font-size: 24px;
            color: #333;
        }
        p {
            font-size: 16px;
            line-height: 1.5;
            color: #555;
        }
        a {
            display: inline-block;
            margin: 20px 0;
            padding: 10px 15px;
            background-color: #add8e6; /* Light blue color */
            color: #000000; /* Black text */
            text-decoration: none;
            border-radius: 3px;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #777;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetURL}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
        <div class="footer">
            <p>&copy; 2024 URMILA. All rights reserved.</p>
        </div>
    </div>
</body>
</html>


      `,
    });

    res.status(200).json({ msg: "Password reset link sent to email." });
  } catch (error) {
    res.status(500).json({ msg: "Server error. Please try again later." });
  }
});



app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ msg: "Password has been reset successfully." });
  } catch (error) {
    res.status(500).json({ msg: "Server error. Please try again later." });
  }
});


app.get("/user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from the authentication middleware
    const user = await User.findById(userId).select("name email"); // Adjust fields as needed

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.status(200).json({ name: user.name, email: user.email });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ msg: "Error fetching user" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ msg: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ msg: "Invalid email or password" });
  }

  // Generate token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  // Send token and success message
  res.status(200).json({ token, msg: "Login successful" });
});

app.get("/", (req, res) => {
  res.send("Welcome to the backend!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});