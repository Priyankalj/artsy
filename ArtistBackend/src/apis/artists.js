const express = require("express");
const validateRequest = require("../middlewares/validate-request");
const { authenticate } = require("../middlewares/authentication");
const requestLogger = require("../middlewares/request-logger");
const {
  artistOnboardSchema,
  artistAvailabilitySchema,
  artistBankSchema,
} = require("../validations/artists");
const {
  fetchCategories,
  fetchArtists,
  fetchArtistById,
  fetchArtistGallery,
  onboardArtist,
  getMyArtistProfile,
  updateMyAvailability,
  saveMyBankAccount,
  fetchEarnings,
} = require("../controllers/artists");

const router = express.Router();

router.get("/categories", fetchCategories);
router.get("/", fetchArtists);
router.get("/me", authenticate, getMyArtistProfile);
router.post(
  "/me/bank",
  authenticate,
  requestLogger,
  validateRequest(artistBankSchema),
  saveMyBankAccount
);
router.patch(
  "/me/availability",
  authenticate,
  requestLogger,
  validateRequest(artistAvailabilitySchema),
  updateMyAvailability
);
router.get("/earnings", authenticate, fetchEarnings);
router.get("/:id/gallery", fetchArtistGallery);
router.get("/:id", fetchArtistById);
router.post(
  "/onboard",
  authenticate,
  requestLogger,
  validateRequest(artistOnboardSchema),
  onboardArtist
);

module.exports = router;
