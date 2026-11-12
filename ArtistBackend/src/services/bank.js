const { shouldMockThirdParties } = require("../utils/environment");

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_PATTERN = /^\d{9,18}$/;

const normalizeAccountNumber = (value) =>
  String(value || "").replace(/\s+/g, "");

const normalizeIfsc = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");

const validateBankDetails = ({ accountNumber, ifsc }) => {
  const number = normalizeAccountNumber(accountNumber);
  const code = normalizeIfsc(ifsc);
  if (!ACCOUNT_PATTERN.test(number)) {
    return { valid: false, message: "Enter a valid 9–18 digit account number" };
  }
  if (!IFSC_PATTERN.test(code)) {
    return { valid: false, message: "Enter a valid 11-character IFSC code" };
  }
  return { valid: true, accountNumber: number, ifsc: code };
};

const verifyBankAccount = async ({ accountNumber, ifsc, accountName }) => {
  const parsed = validateBankDetails({ accountNumber, ifsc });
  if (!parsed.valid) {
    return { verified: false, message: parsed.message };
  }

  if (shouldMockThirdParties()) {
    return {
      verified: true,
      mock: true,
      accountNumber: parsed.accountNumber,
      ifsc: parsed.ifsc,
      accountName: String(accountName || "").trim(),
    };
  }

  // Live penny-drop / Razorpay fund-account validation lands with payouts.
  return {
    verified: true,
    mock: false,
    accountNumber: parsed.accountNumber,
    ifsc: parsed.ifsc,
    accountName: String(accountName || "").trim(),
  };
};

module.exports = {
  IFSC_PATTERN,
  ACCOUNT_PATTERN,
  normalizeAccountNumber,
  normalizeIfsc,
  validateBankDetails,
  verifyBankAccount,
};
