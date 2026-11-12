const Joi = require("joi");
const { getPortfolioLimits } = require("../config/portfolio");

const { minPhotos, maxPhotos, minVideos, maxVideos } = getPortfolioLimits();

const ALLOWED_CATEGORIES = [
  "makeup",
  "mehendi",
  "singer",
  "dancer",
  "dj",
  "photo",
  "mc",
  "choreo",
  "music",
];

const EXPERIENCE_OPTIONS = [
  "1–2 years",
  "3–5 years",
  "5–8 years",
  "8+ years",
];

const TIME_HHMM = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/);

const availabilityDaySchema = Joi.object({
  enabled: Joi.boolean().required(),
  start: TIME_HHMM.required(),
  end: TIME_HHMM.required(),
}).custom((value, helpers) => {
  if (value.enabled && value.start >= value.end) {
    return helpers.message("End time must be after start time");
  }
  return value;
});

const artistBankSchema = Joi.object({
  accountNumber: Joi.string()
    .pattern(/^\d{9,18}$/)
    .required()
    .messages({
      "string.pattern.base": "Enter a valid 9–18 digit account number",
    }),
  confirmAccountNumber: Joi.string()
    .valid(Joi.ref("accountNumber"))
    .required()
    .messages({
      "any.only": "Account numbers do not match",
    }),
  ifsc: Joi.string()
    .uppercase()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      "string.pattern.base": "Enter a valid 11-character IFSC code",
    }),
  accountName: Joi.string().trim().min(2).max(150).allow("", null),
});

const artistAvailabilitySchema = Joi.object({
  availability: Joi.object({
    mon: availabilityDaySchema.required(),
    tue: availabilityDaySchema.required(),
    wed: availabilityDaySchema.required(),
    thu: availabilityDaySchema.required(),
    fri: availabilityDaySchema.required(),
    sat: availabilityDaySchema.required(),
    sun: availabilityDaySchema.required(),
  }).required(),
});

const artistOnboardSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s.'-]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Name can only contain letters, spaces, and . ' -",
    }),
  stageName: Joi.string().trim().allow("").max(100),
  bio: Joi.string().trim().min(10).max(200).required(),
  category: Joi.string()
    .valid(...ALLOWED_CATEGORIES)
    .required(),
  experience: Joi.string()
    .valid(...EXPERIENCE_OPTIONS)
    .required(),
  languages: Joi.array().items(Joi.string().trim()).min(1).required(),
  events: Joi.array().items(Joi.string().trim()).min(1).required(),
  portfolioPhotos: Joi.array()
    .items(Joi.string())
    .min(minPhotos)
    .max(maxPhotos)
    .required(),
  portfolioVideos: Joi.array()
    .items(Joi.string())
    .min(minVideos)
    .max(maxVideos)
    .required(),
  priceType: Joi.string().valid("fixed", "quote").required(),
  price: Joi.when("priceType", {
    is: "fixed",
    then: Joi.number().positive().max(999999999).required(),
    otherwise: Joi.number().min(0).max(999999999).default(0),
  }),
  travelAllowance: Joi.number().min(0).max(999999999).default(0),
  trialSessionFee: Joi.number().min(0).max(999999999).default(0),
  teamMemberFee: Joi.number().min(0).max(999999999).default(0),
  profilePhoto: Joi.string().allow("", null),
  // ID + selfie moved to DigiLocker / VerifySelfie after Pricing.
  idImage: Joi.string().allow("", null),
  selfieImage: Joi.string().allow("", null),
  videoInterview: Joi.string().allow("", null),
  location: Joi.string().allow("").max(100),
});

module.exports = {
  artistOnboardSchema,
  artistAvailabilitySchema,
  artistBankSchema,
  ALLOWED_CATEGORIES,
  EXPERIENCE_OPTIONS,
};
