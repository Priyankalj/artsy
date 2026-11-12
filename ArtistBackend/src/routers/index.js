const express = require("express");

const auth = require("../apis/auth");
const users = require("../apis/users");
const artists = require("../apis/artists");
const bookings = require("../apis/bookings");
const uploads = require("../apis/uploads");
const config = require("../apis/config");
const payments = require("../apis/payments");
const kyc = require("../apis/kyc");

const router = express.Router();

router.use("/auth", auth);
router.use("/users", users);
router.use("/artists", artists);
router.use("/bookings", bookings);
router.use("/uploads", uploads);
router.use("/config", config);
router.use("/payments", payments);
router.use("/kyc", kyc);

module.exports = router;
