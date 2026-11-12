const { shouldMockThirdParties } = require("../utils/environment");

/**
 * Public verified badge is never granted at profile create.
 * DEV marks verified after mocked DigiLocker + selfie; PROD waits for face_matched + approve.
 */
const resolveInitialVerification = () => ({
  verified: false,
  badges: [],
  verification_status: "pending",
});

const publicVerifiedFromStatus = (status) => {
  if (status === "approved" || status === "approved_dev_mock") {
    return true;
  }
  if (status === "face_matched" && shouldMockThirdParties()) {
    return true;
  }
  return false;
};

module.exports = {
  resolveInitialVerification,
  publicVerifiedFromStatus,
};
