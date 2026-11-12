const { pool } = require("./db");
const { shouldMockThirdParties } = require("../utils/environment");

const VERIFIED_STATUSES = new Set([
  "face_matched",
  "approved",
  "approved_dev_mock",
]);

const DIGILOCKER_DONE_STATUSES = new Set([
  "digilocker_complete",
  "face_matched",
  "approved",
  "approved_dev_mock",
]);

const isDigilockerDone = (status) =>
  DIGILOCKER_DONE_STATUSES.has(String(status || ""));

const isSelfieDone = (status) => VERIFIED_STATUSES.has(String(status || ""));

const getKycRow = async (userId) => {
  const { rows } = await pool.query(
    `SELECT user_id, phone, name, role, is_onboarded, onboarding_step,
            verification_status, aadhaar_last4, aadhaar_name,
            digilocker_transaction_id
     FROM users WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const saveDigilockerSession = async (userId, transactionId) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET digilocker_transaction_id = $2,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING user_id, digilocker_transaction_id`,
    [userId, transactionId]
  );
  return rows[0] || null;
};

const getUserByTransactionId = async (transactionId) => {
  const { rows } = await pool.query(
    `SELECT user_id, phone, name, role, verification_status,
            digilocker_transaction_id
     FROM users WHERE digilocker_transaction_id = $1 LIMIT 1`,
    [transactionId]
  );
  return rows[0] || null;
};

const markDigilockerComplete = async (
  userId,
  { aadhaarLast4, aadhaarName, status = "digilocker_complete" } = {}
) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET verification_status = $2,
         aadhaar_last4 = COALESCE($3, aadhaar_last4),
         aadhaar_name = COALESCE($4, aadhaar_name),
         onboarding_step = 'selfie',
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING user_id, verification_status, aadhaar_last4, aadhaar_name,
               onboarding_step, role, is_onboarded`,
    [userId, status, aadhaarLast4 || null, aadhaarName || null]
  );
  return rows[0] || null;
};

const markSelfieMatched = async (userId) => {
  const existing = await getKycRow(userId);
  const status = shouldMockThirdParties()
    ? "approved_dev_mock"
    : "face_matched";
  const isArtist = existing?.role === "artist";
  const { rows } = await pool.query(
    `UPDATE users
     SET verification_status = $2,
         is_onboarded = $3,
         onboarding_step = $4,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING user_id, phone, name, role, is_onboarded, onboarding_step,
               verification_status, aadhaar_last4, aadhaar_name`,
    [userId, status, !isArtist, isArtist ? "bank" : "complete"]
  );
  return rows[0] || null;
};

const markArtistVerified = async (userId, verified) => {
  const { rows } = await pool.query(
    `UPDATE artists
     SET verified = $2,
         badges = CASE
           WHEN $2 THEN ARRAY(
             SELECT DISTINCT unnest(COALESCE(badges, '{}') || ARRAY['verified'])
           )
           ELSE array_remove(COALESCE(badges, '{}'), 'verified')
         END,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING artist_id, verified, badges`,
    [userId, Boolean(verified)]
  );
  return rows[0] || null;
};

const toPublicStatus = (row) => {
  const status = row?.verification_status || "pending";
  return {
    verification_status: status,
    digilockerVerified: isDigilockerDone(status),
    selfieVerified: isSelfieDone(status),
    aadhaar_last4: row?.aadhaar_last4 || null,
    aadhaar_name: row?.aadhaar_name || null,
  };
};

module.exports = {
  VERIFIED_STATUSES,
  isDigilockerDone,
  isSelfieDone,
  getKycRow,
  saveDigilockerSession,
  getUserByTransactionId,
  markDigilockerComplete,
  markSelfieMatched,
  markArtistVerified,
  toPublicStatus,
};
