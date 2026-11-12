const { StatusCodes } = require("http-status-codes");
const asyncWrapper = require("../middlewares/async");
const CustomError = require("../errors/custom-error");
const lang = require("../languages");
const { findUserById } = require("../models/auth");
const { getArtistById } = require("../models/artists");
const {
  createBooking,
  getBookingById,
  listBookingsForUser,
  updateBookingStatus,
} = require("../models/bookings");
const { sendToUser } = require("../services/push");
const { sendBookingSms, sendBookingEmail } = require("../services/notify");

const alertUser = (user, { title, body, data, date, status, artist }) => {
  if (!user) {
    return;
  }
  sendToUser(user.user_id, { title, body, data });
  sendBookingSms(user.phone, {
    title,
    body,
    name: user.name,
    date,
    status,
    artist,
  });
  sendBookingEmail(user.email, {
    title,
    body,
    name: user.name,
    date,
    status,
    artist,
  });
};

const createNewBooking = asyncWrapper(async (req, res, next) => {
  const artist = await getArtistById(req.body.artist_id);
  if (!artist) {
    return next(
      new CustomError(
        null,
        lang.locale.VLD_ARTIST_NOT_FOUND,
        StatusCodes.NOT_FOUND,
        "Functional"
      )
    );
  }

  const customer = await findUserById(req.authuser.user_id);

  // Prefer server-side price when artist has a fixed amount.
  const base = Number(artist.price) || 0;
  const serverAmount =
    base > 0 ? base + Math.round(base * 0.05) : Number(req.body.amount) || 0;

  const paid =
    req.body.payment_status === "paid" &&
    Boolean(req.body.razorpay_order_id || req.body.razorpay_payment_id);

  const booking = await createBooking({
    ...req.body,
    customer_user_id: req.authuser.user_id,
    client_name: customer?.name || req.body.client_name || null,
    amount: serverAmount || req.body.amount || 0,
    payment_status: paid ? "paid" : req.body.payment_status || "pending",
    razorpay_order_id: req.body.razorpay_order_id || null,
    razorpay_payment_id: req.body.razorpay_payment_id || null,
    payment_mock: req.body.payment_mock === true,
  });

  const full = await getBookingById(booking.booking_id);
  const artistUser = await findUserById(artist.user_id);

  alertUser(artistUser, {
    title: "New booking request",
    body: `${customer?.name || "A customer"} requested you for ${full.event_date}.`,
    data: {
      screen: "Bookings",
      booking_id: full.booking_id,
    },
    date: full.event_date,
    status: full.status,
    artist: artist.name,
  });

  return res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Booking created successfully",
    data: { booking: full },
  });
});

const fetchMyBookings = asyncWrapper(async (req, res) => {
  const role = req.authuser.role || "user";
  const bookings = await listBookingsForUser(
    req.authuser.user_id,
    role,
    req.query.status
  );

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Bookings fetched successfully",
    data: { bookings, count: bookings.length },
  });
});

const fetchBookingById = asyncWrapper(async (req, res, next) => {
  const booking = await getBookingById(req.params.id);
  if (!booking) {
    return next(
      new CustomError(
        null,
        lang.locale.VLD_BOOKING_NOT_FOUND,
        StatusCodes.NOT_FOUND,
        "Functional"
      )
    );
  }

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Booking fetched successfully",
    data: { booking },
  });
});

const patchBookingStatus = asyncWrapper(async (req, res, next) => {
  const existing = await getBookingById(req.params.id);
  if (!existing) {
    return next(
      new CustomError(
        null,
        lang.locale.VLD_BOOKING_NOT_FOUND,
        StatusCodes.NOT_FOUND,
        "Functional"
      )
    );
  }

  await updateBookingStatus(req.params.id, req.body.status);
  const booking = await getBookingById(req.params.id);

  const artist = await getArtistById(booking.artist_id);
  const actorId = req.authuser.user_id;
  const notifyUserId =
    Number(actorId) === Number(booking.customer_user_id)
      ? artist?.user_id
      : booking.customer_user_id;
  const notifyUser = await findUserById(notifyUserId);

  alertUser(notifyUser, {
    title: "Booking update",
    body: `Your booking is now ${booking.status}.`,
    data: {
      screen: "Bookings",
      booking_id: booking.booking_id,
    },
    date: booking.event_date,
    status: booking.status,
    artist: artist?.name,
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Booking status updated",
    data: { booking },
  });
});

module.exports = {
  createNewBooking,
  fetchMyBookings,
  fetchBookingById,
  patchBookingStatus,
};
