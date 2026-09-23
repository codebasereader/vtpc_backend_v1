const express = require("express");
const auth = require("../controllers/authController");
const { loginLimiter } = require("../middleware/rateLimit");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", loginLimiter, auth.login);
router.post("/logout", auth.logout);
router.get("/me", requireAuth, auth.me);

module.exports = router;
