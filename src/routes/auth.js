const express = require("express");
const auth = require("../controllers/authController");
const { loginLimiter, loginEmailLimiter } = require("../middleware/rateLimit");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", loginLimiter, loginEmailLimiter, auth.login);
router.post("/logout", auth.logout);
router.get("/me", requireAuth, auth.me);
router.post("/change-password", requireAuth, auth.changePassword);

module.exports = router;
