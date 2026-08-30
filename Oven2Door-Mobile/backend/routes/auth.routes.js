const express = require("express");
const router = express.Router();
const { getAuth } = require("../firebase");
const db = require("../db");

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { idToken, firstName, lastName, phone } = req.body;
    if (!idToken || !firstName || !lastName || !phone) {
      return res.status(400).json({ success: false, message: "Missing required signup details" });
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;
    if (!email) {
      return res.status(400).json({ success: false, message: "Firebase account does not have an email address" });
    }

    await db.query(
      `INSERT INTO users (user_id, first_name, last_name, email, phone)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         first_name = VALUES(first_name),
         last_name = VALUES(last_name),
         email = VALUES(email),
         phone = VALUES(phone)`,
      [uid, firstName, lastName, email, phone]
    );

    res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error("Signup error:", err);   // ✅ shows exact cause
    res.status(500).json({ success: false, message: "Could not save the user to MySQL" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;
    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const [rows] = await db.query("SELECT * FROM users WHERE user_id = ?", [uid]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("Login error:", err);   // ✅ shows exact cause
    res.status(400).json({ success: false, message: "Login failed" });
  }
});

module.exports = router;
