const { getPortfolioLimits } = require("../config/portfolio");

const CUSTOMER_STEPS = [
  { id: "role", label: "Choose your role", description: "Customer or artist" },
  { id: "name", label: "Your name", description: "Tell artists who you are" },
  { id: "interests", label: "Interests", description: "Categories you want to book" },
  { id: "location", label: "Location", description: "Where you host events" },
  { id: "digilocker", label: "Aadhaar", description: "Verify with DigiLocker" },
  { id: "selfie", label: "Selfie", description: "Match your photo with Aadhaar" },
];

const ARTIST_STEPS = [
  { id: "role", label: "Choose your role", description: "Customer or artist" },
  { id: "profile", label: "Basic profile", description: "Name, photo and bio" },
  { id: "category", label: "Category", description: "What type of artist you are" },
  { id: "experience", label: "Experience", description: "Years, languages and events" },
  { id: "portfolio", label: "Portfolio", description: "Photos and videos of your work" },
  { id: "pricing", label: "Pricing", description: "How you charge for bookings" },
  { id: "digilocker", label: "Aadhaar", description: "Verify with DigiLocker" },
  { id: "selfie", label: "Selfie", description: "Match your photo with Aadhaar" },
  { id: "bank", label: "Bank", description: "Verify the account for payouts" },
];

const CUSTOMER_STEP_IDS = CUSTOMER_STEPS.map((step) => step.id);
const ARTIST_STEP_IDS = ARTIST_STEPS.map((step) => step.id);
const ALL_STEP_IDS = [...new Set([...CUSTOMER_STEP_IDS, ...ARTIST_STEP_IDS])];

const hasText = (value, min = 1) => String(value || "").trim().length >= min;

const asArray = (value) => (Array.isArray(value) ? value : []);

const isRoleDone = (user) => user?.role === "artist" || user?.role === "user";

const DIGILOCKER_DONE = new Set([
  "digilocker_complete",
  "face_matched",
  "approved",
  "approved_dev_mock",
]);
const SELFIE_DONE = new Set([
  "face_matched",
  "approved",
  "approved_dev_mock",
]);

const isArtistBankDone = (artist) =>
  Boolean(artist?.bank_verified) &&
  hasText(artist?.bank_ifsc, 11) &&
  hasText(artist?.bank_account_last4, 4);

const isCustomerStepDone = (stepId, user, customer) => {
  if (stepId === "role") return isRoleDone(user);
  if (stepId === "name") return hasText(customer?.name || user?.name, 2);
  if (stepId === "interests") return asArray(customer?.interests).length > 0;
  if (stepId === "location") return hasText(customer?.location, 2);
  if (stepId === "digilocker") {
    return DIGILOCKER_DONE.has(String(user?.verification_status || ""));
  }
  if (stepId === "selfie") {
    return SELFIE_DONE.has(String(user?.verification_status || ""));
  }
  return false;
};

const isArtistStepDone = (stepId, user, artist) => {
  if (stepId === "role") return isRoleDone(user);
  if (stepId === "profile") {
    return hasText(artist?.name || user?.name, 2) && hasText(artist?.bio, 10);
  }
  if (stepId === "category") return hasText(artist?.category, 2);
  if (stepId === "experience") {
    return (
      hasText(artist?.experience, 2) &&
      asArray(artist?.languages).length > 0 &&
      asArray(artist?.events).length > 0
    );
  }
  if (stepId === "portfolio") {
    const { minPhotos, minVideos } = getPortfolioLimits();
    return (
      asArray(artist?.portfolio_photos).length >= minPhotos &&
      asArray(artist?.portfolio_videos).length >= minVideos
    );
  }
  if (stepId === "pricing") {
    const priceType = artist?.price_type || "fixed";
    if (priceType === "quote") return true;
    return Number(artist?.price) > 0;
  }
  if (stepId === "digilocker") {
    return DIGILOCKER_DONE.has(String(user?.verification_status || ""));
  }
  if (stepId === "selfie") {
    return SELFIE_DONE.has(String(user?.verification_status || ""));
  }
  if (stepId === "bank") {
    return isArtistBankDone(artist);
  }
  return false;
};

const definitionsFor = (user) => {
  if (user?.role === "artist") return ARTIST_STEPS;
  if (user?.role === "user") return CUSTOMER_STEPS;
  return [{ id: "role", label: "Choose your role", description: "Customer or artist" }];
};

const isFullyOnboarded = (user, artist) => {
  if (!user?.is_onboarded) return false;
  if (user?.role === "artist") return isArtistBankDone(artist);
  return true;
};

const isStepDone = (stepId, user, customer, artist) => {
  if (stepId === "bank") {
    return isArtistBankDone(artist);
  }
  if (user?.is_onboarded) return true;
  if (user?.role === "artist") return isArtistStepDone(stepId, user, artist);
  if (user?.role === "user") return isCustomerStepDone(stepId, user, customer);
  return stepId === "role" ? isRoleDone(user) : false;
};

const nextStepAfter = (stepId, user) => {
  const ids =
    user?.role === "artist"
      ? ARTIST_STEP_IDS
      : user?.role === "user"
        ? CUSTOMER_STEP_IDS
        : ["role"];
  const index = ids.indexOf(stepId);
  if (index < 0 || index >= ids.length - 1) return ids[ids.length - 1] || "role";
  return ids[index + 1];
};

const firstStepForRole = (role) => (role === "artist" ? "profile" : "name");

const buildOnboarding = ({ user, customer = null, artist = null } = {}) => {
  const definitions = definitionsFor(user);
  const steps = definitions.map((step) => ({
    ...step,
    status: isStepDone(step.id, user, customer, artist) ? "done" : "pending",
  }));

  const current =
    steps.find((step) => step.status === "pending")?.id || "complete";

  const complete = isFullyOnboarded(user, artist);
  return {
    is_onboarded: complete,
    current_step: complete ? "complete" : current,
    steps,
  };
};

const screenForStep = (stepId, role) => {
  if (stepId === "role") return "RoleSelection";
  if (stepId === "digilocker") return "DigilockerInstructions";
  if (stepId === "selfie") return "VerifySelfie";
  if (stepId === "bank") return "BankDetails";
  if (role === "artist") return "ArtistOnboard";
  if (role === "user") return "CustomerOnboard";
  return "RoleSelection";
};

const artistFormIndex = (stepId) => {
  const map = {
    profile: 0,
    category: 1,
    experience: 2,
    portfolio: 3,
    pricing: 4,
    digilocker: 4,
    selfie: 4,
    bank: 4,
  };
  return map[stepId] ?? 0;
};

const customerFormIndex = (stepId) => {
  const map = { name: 0, interests: 1, location: 2, digilocker: 2, selfie: 2 };
  return map[stepId] ?? 0;
};

module.exports = {
  ALL_STEP_IDS,
  ARTIST_STEPS,
  CUSTOMER_STEPS,
  artistFormIndex,
  buildOnboarding,
  customerFormIndex,
  firstStepForRole,
  nextStepAfter,
  screenForStep,
  isArtistBankDone,
  isFullyOnboarded,
};
