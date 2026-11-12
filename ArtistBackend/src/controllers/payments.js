const { StatusCodes } = require("http-status-codes");
const asyncWrapper = require("../middlewares/async");
const CustomError = require("../errors/custom-error");
const { getArtistById } = require("../models/artists");
const {
  createPaymentOrder,
  confirmPayment,
  getClientPaymentConfig,
} = require("../services/payments");

const fetchPaymentConfig = asyncWrapper(async (req, res) => {
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Payment config fetched",
    data: getClientPaymentConfig(),
  });
});

/**
 * Prefer artist_id so the server computes amount (do not trust the client total).
 * Falls back to body.amount when artist has no fixed price.
 */
const resolveOrderAmount = async (body) => {
  let amount = Number(body.amount);
  if (body.artist_id) {
    const artist = await getArtistById(body.artist_id);
    if (artist) {
      const base = Number(artist.price) || 0;
      if (base > 0) {
        const fee = Math.round(base * 0.05);
        amount = base + fee;
      }
    }
  }
  return amount;
};

const createOrder = asyncWrapper(async (req, res, next) => {
  let amount;
  try {
    amount = await resolveOrderAmount(req.body);
  } catch (error) {
    return next(
      new CustomError(
        error,
        "Could not resolve payment amount",
        StatusCodes.BAD_REQUEST,
        "validation"
      )
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return next(
      new CustomError(
        null,
        "Valid amount is required",
        StatusCodes.BAD_REQUEST,
        "validation"
      )
    );
  }

  try {
    const order = await createPaymentOrder({
      amount,
      currency: req.body.currency,
      receipt: req.body.receipt,
      notes: {
        artist_id: req.body.artist_id,
        booking_id: req.body.booking_id,
        user_id: req.authuser?.user_id,
        ...(req.body.notes || {}),
      },
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: order.mock
        ? "Mock payment order created"
        : "Payment order created",
      data: {
        order,
        amount_inr: amount,
        payments: getClientPaymentConfig(),
      },
    });
  } catch (error) {
    return next(
      new CustomError(
        error,
        error.message || "Could not create payment order",
        StatusCodes.BAD_GATEWAY,
        "Functional"
      )
    );
  }
});

const confirmOrderPayment = asyncWrapper(async (req, res, next) => {
  const orderId = String(req.body.order_id || "").trim();
  if (!orderId) {
    return next(
      new CustomError(
        null,
        "order_id is required",
        StatusCodes.BAD_REQUEST,
        "validation"
      )
    );
  }

  try {
    const result = await confirmPayment({
      orderId,
      paymentId: req.body.payment_id,
      signature: req.body.signature,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: result.mock ? "Mock payment confirmed" : "Payment confirmed",
      data: result,
    });
  } catch (error) {
    return next(
      new CustomError(
        error,
        error.message || "Payment confirmation failed",
        StatusCodes.BAD_REQUEST,
        "validation"
      )
    );
  }
});

module.exports = {
  fetchPaymentConfig,
  createOrder,
  confirmOrderPayment,
};
