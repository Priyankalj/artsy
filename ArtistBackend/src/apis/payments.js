const express = require("express");
const { authenticate } = require("../middlewares/authentication");
const {
  fetchPaymentConfig,
  createOrder,
  confirmOrderPayment,
} = require("../controllers/payments");

const router = express.Router();

router.get("/config", authenticate, fetchPaymentConfig);
router.post("/order", authenticate, createOrder);
router.post("/confirm", authenticate, confirmOrderPayment);

module.exports = router;
