const crypto = require("crypto");
const Razorpay = require("razorpay");
const env = require("../../env");
const { isDevLike, isProd } = require("../utils/environment");

const isRazorpayConfigured = () =>
  Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

/**
 * DEV without keys → mock.
 * DEV/UAT with rzp_test_* keys → real Razorpay Test API.
 * Force mock anytime with RAZORPAY_FORCE_MOCK: true.
 */
const shouldUseMockPayments = () => {
  if (env.RAZORPAY_FORCE_MOCK === true) {
    return true;
  }
  if (!isRazorpayConfigured()) {
    return true;
  }
  // Live keys must not run outside PROD unless explicitly forced.
  const keyId = String(env.RAZORPAY_KEY_ID || "");
  if (keyId.startsWith("rzp_live_") && !isProd()) {
    console.warn(
      "[payments] live key ignored outside PROD — using mock. Set ENVIRONMENT=PROD for live."
    );
    return true;
  }
  return false;
};

const getRazorpayClient = () => {
  if (shouldUseMockPayments()) {
    return null;
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
};

const createPaymentOrder = async ({
  amount,
  currency = "INR",
  receipt,
  notes,
}) => {
  const paise = Math.round(Number(amount || 0) * 100);
  if (!Number.isFinite(paise) || paise < 100) {
    throw new Error("Amount must be at least ₹1");
  }

  const client = getRazorpayClient();
  if (!client) {
    const orderId = `order_dev_${crypto.randomBytes(6).toString("hex")}`;
    console.warn(
      `[payments] DEV mock order ${orderId} amount=${paise} ${currency}`
    );
    return {
      mock: true,
      id: orderId,
      entity: "order",
      amount: paise,
      amount_paid: 0,
      amount_due: paise,
      currency: currency || env.RAZORPAY_CURRENCY || "INR",
      receipt: receipt || orderId,
      status: "created",
      notes: notes || {},
      key_id: env.RAZORPAY_KEY_ID || "rzp_test_dev_mock",
    };
  }

  const order = await client.orders.create({
    amount: paise,
    currency: currency || env.RAZORPAY_CURRENCY || "INR",
    receipt: String(receipt || `rcpt_${Date.now()}`).slice(0, 40),
    notes: notes || {},
  });

  return {
    mock: false,
    ...order,
    key_id: env.RAZORPAY_KEY_ID,
  };
};

const verifyCheckoutSignature = (orderId, paymentId, signature) => {
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
};

/**
 * Confirm after Checkout (or DEV mock).
 * Mock path does not require a real signature.
 */
const confirmPayment = async ({ orderId, paymentId, signature }) => {
  if (!orderId) {
    throw new Error("order_id is required");
  }

  if (shouldUseMockPayments()) {
    const id = paymentId || `pay_dev_${crypto.randomBytes(6).toString("hex")}`;
    console.warn(`[payments] DEV mock confirm order=${orderId} payment=${id}`);
    return {
      mock: true,
      verified: true,
      order_id: orderId,
      payment_id: id,
      signature: signature || "dev_signature",
      status: "captured",
    };
  }

  if (!paymentId || !signature) {
    throw new Error("payment_id and signature are required");
  }

  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    throw new Error("Invalid payment signature");
  }

  return {
    mock: false,
    verified: true,
    order_id: orderId,
    payment_id: paymentId,
    signature,
    status: "captured",
  };
};

const getClientPaymentConfig = () => {
  const mock = shouldUseMockPayments();
  return {
    mock,
    key_id: mock
      ? env.RAZORPAY_KEY_ID || "rzp_test_dev_mock"
      : env.RAZORPAY_KEY_ID || "",
    currency: env.RAZORPAY_CURRENCY || "INR",
    company_name: env.RAZORPAY_COMPANY_NAME || "Artsy",
    live: isProd() && isRazorpayConfigured() && !mock,
    environment: isDevLike() ? "dev" : isProd() ? "prod" : "other",
  };
};

module.exports = {
  createPaymentOrder,
  confirmPayment,
  getClientPaymentConfig,
  isRazorpayConfigured,
  shouldUseMockPayments,
  verifyCheckoutSignature,
};
