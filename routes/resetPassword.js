const router = require("express").Router();
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "kingwaretech@gmail.com",
    pass: "@idonRich24!",
  },
});

const verificationCodes = {};

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email });
  console.log("usr", user);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const code = Math.floor(100000 + Math.random() * 900000); // Generate a random 6-digit code
  verificationCodes[user.id] = code;

  const mailOptions = {
    from: "kingwaretech@gmail.com",
    to: email,
    subject: "Password Reset Code",
    text: `Your verification code is: ${code}`,
  };

  emailTransporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.json({ message: "Verification code sent successfully" });
  });
});

module.exports = router;
