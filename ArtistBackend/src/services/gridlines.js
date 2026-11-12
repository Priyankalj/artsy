const axios = require("axios");
const http = require("http");
const https = require("https");
const { randomUUID } = require("crypto");
const env = require("../../env");
const { shouldMockThirdParties } = require("../utils/environment");

const ACCESS_GRANTED = "1004";
const ACCESS_DENIED = "1003";
const AUTH_URL_GENERATED = "1000";
const FETCHED_ISSUED_FILE = "1008";
const FETCHED_EAADHAAR = "1011";
const FACE_MATCH_SAME = "1000";
const FACE_MATCH_DIFFERENT = "1001";

const MOCK_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAAEAAQMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAABAgcA/8QAFhABAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIQAxAAAAGlAf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Af//Z";

const shouldMockKyc = () => {
  if (env.KYC_MOCK_RESPONSE === true) return true;
  if (env.KYC_MOCK_RESPONSE === false) return false;
  return shouldMockThirdParties();
};

const gridlinesClient = axios.create({
  baseURL: env.KYC_API_URL,
  timeout: 30000,
  httpAgent: new http.Agent({ family: 4 }),
  httpsAgent: new https.Agent({ family: 4 }),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const normalizeMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return "";
};

const normalizeBase64 = (value) => {
  if (!value || typeof value !== "string") return null;
  const cleaned = value.replace(/^data:[^;]+;base64,/i, "").replace(/\s/g, "");
  return cleaned.length > 80 ? cleaned : null;
};

const gridlinesHeaders = ({ transaction_id, reference_id } = {}) => {
  const headers = {
    "X-API-Key": env.KYC_API_KEY,
    "X-Auth-Type": "API-Key",
    "X-Reference-ID": reference_id || randomUUID(),
  };
  if (transaction_id) {
    headers["X-Transaction-ID"] = transaction_id;
  }
  return headers;
};

const extractError = (error) => {
  const responseData = error?.response?.data;
  if (responseData?.error?.message) {
    return {
      success: false,
      code: responseData.error.code || "GRIDLINES_ERROR",
      message: responseData.error.message,
      data: responseData,
    };
  }
  if (responseData?.data?.message) {
    return {
      success: false,
      code: responseData.data.code || "GRIDLINES_ERROR",
      message: responseData.data.message,
      data: responseData,
    };
  }
  return {
    success: false,
    code: "GRIDLINES_ERROR",
    message: error?.message || "DigiLocker request failed",
    data: responseData || null,
  };
};

const getMockEaadhaar = () => ({
  CertificateData: {
    KycRes: {
      ret: "Y",
      UidData: {
        uid: "999999990019",
        Poi: {
          dob: "01-01-1995",
          gender: "M",
          name: "Mock Digilocker User",
        },
        Pht: MOCK_JPEG_BASE64,
        Poa: {
          co: "S/O Mock Father",
          country: "India",
          dist: "Bengaluru",
          loc: "Koramangala",
          pc: "560034",
          po: "Koramangala",
          state: "Karnataka",
          vtc: "Bengaluru",
          house: "A-101",
        },
      },
    },
  },
});

const requestGridlines = async ({ method, url, body, transaction_id, reference_id, params }) => {
  if (shouldMockKyc()) {
    return { success: true, mock: true, data: { data: { code: "1000" } } };
  }

  if (!env.KYC_API_KEY || !env.KYC_API_URL) {
    return {
      success: false,
      code: "GRIDLINES_NOT_CONFIGURED",
      message: "Gridlines API is not configured",
    };
  }

  try {
    const { data } = await gridlinesClient.request({
      method,
      url,
      data: body,
      params,
      headers: gridlinesHeaders({ transaction_id, reference_id }),
    });
    return { success: true, data };
  } catch (error) {
    return extractError(error);
  }
};

const initDigilocker = async ({
  redirect_uri,
  mobile_number,
  consent = "Y",
  sign_up_preference = "PINLESS",
  check_account_linked = "true",
  pinless = true,
  reference_id,
}) => {
  const mobile = normalizeMobile(mobile_number);
  if (!mobile) {
    return {
      success: false,
      code: "MOBILE_REQUIRED",
      message: "Mobile number is required to start DigiLocker",
    };
  }

  if (shouldMockKyc()) {
    const transaction_id = `bypass-${reference_id || randomUUID()}`;
    return {
      success: true,
      mock: true,
      bypass: true,
      code: AUTH_URL_GENERATED,
      message: "DigiLocker bypassed for DEV",
      transaction_id,
      authorization_url: null,
    };
  }

  const result = await requestGridlines({
    method: "post",
    url: "/digilocker/init",
    body: {
      redirect_uri,
      consent,
      sign_up_preference,
      check_account_linked,
      purpose: env.DIGILOCKER_PURPOSE || "Artist identity verification",
      service_name: env.DIGILOCKER_SERVICE_NAME || "Artsy",
      mobile_number: mobile,
    },
    reference_id,
    params: pinless ? { pinless: true } : undefined,
  });

  if (!result.success) return result;

  const data = result.data?.data || {};
  const transaction_id = data.transaction_id || result.data?.transaction_id || null;
  const authorization_url =
    data.authorization_url || result.data?.authorization_url || null;

  if (String(data.code) !== AUTH_URL_GENERATED || !authorization_url) {
    return {
      success: false,
      code: data.code || "INIT_FAILED",
      message: data.message || "Failed to generate DigiLocker authorization URL",
    };
  }

  return {
    success: true,
    code: data.code,
    message: data.message,
    transaction_id,
    authorization_url,
  };
};

const fetchEaadhaar = async (transaction_id, { reference_id } = {}) => {
  if (shouldMockKyc()) {
    return {
      success: true,
      mock: true,
      code: FETCHED_EAADHAAR,
      eaadhaar: getMockEaadhaar(),
      eaadhaar_link: null,
    };
  }

  const result = await requestGridlines({
    method: "get",
    url: "/digilocker/eaadhaar",
    transaction_id,
    reference_id,
  });
  if (!result.success) return result;
  const data = result.data?.data || {};
  return {
    success:
      String(data.code) === FETCHED_EAADHAAR ||
      String(data.code) === FETCHED_ISSUED_FILE,
    code: data.code,
    message: data.message,
    eaadhaar: data.eaadhaar || null,
    eaadhaar_link: data.eaadhaar_link || null,
  };
};

const parseEaadhaar = (eaadhaar) => {
  const uidData =
    eaadhaar?.CertificateData?.KycRes?.UidData ||
    eaadhaar?.KycRes?.UidData ||
    eaadhaar?.UidData ||
    null;
  if (!uidData) return null;

  const poi = uidData.Poi || {};
  const poa = uidData.Poa || {};
  const uidDigits = String(uidData.uid || "").replace(/\D/g, "");
  const photo = normalizeBase64(
    uidData.Pht || uidData.pht || poi.Photo || poi.Pht || ""
  );

  return {
    aadhaarLast4: uidDigits.length >= 4 ? uidDigits.slice(-4) : null,
    name: String(poi.name || "").trim() || null,
    photo,
    address: {
      house: String(poa.house || "").trim(),
      vtc: String(poa.vtc || "").trim(),
      district: String(poa.dist || "").trim(),
      state: String(poa.state || "").trim(),
      pincode: String(poa.pc || poa.pin || "").replace(/\D/g, "").slice(0, 6),
    },
  };
};

const formatFaceMatchUserMessage = (message) => {
  const raw = String(message || "").trim();
  if (/^no face found in file 1\.?$/i.test(raw)) {
    return "No face found in uploaded selfie.";
  }
  return raw;
};

const verifyFaceMatch = async ({
  selfieBase64,
  documentBase64,
  reference_id,
  consent = "Y",
}) => {
  if (shouldMockKyc()) {
    return {
      success: true,
      matched: true,
      confidence: 1,
      code: FACE_MATCH_SAME,
      message: "Face match bypassed for DEV",
      mock: true,
    };
  }

  const file1 = normalizeBase64(selfieBase64);
  const file2 = normalizeBase64(documentBase64);
  if (!file1 || !file2) {
    return {
      success: false,
      matched: false,
      code: "INVALID_IMAGE",
      message: "Both selfie and Aadhaar photos are required for face match",
    };
  }

  const result = await requestGridlines({
    method: "post",
    url: "/face-api/verify",
    reference_id: reference_id || randomUUID(),
    body: {
      file_1_base64: file1,
      file_2_base64: file2,
      consent,
    },
  });

  if (!result.success) {
    return {
      success: false,
      matched: false,
      code: result.code || "GRIDLINES_FACE_MATCH_ERROR",
      message: formatFaceMatchUserMessage(
        result.message || "Face match request failed"
      ),
    };
  }

  const data = result.data?.data || {};
  const normalizedCode = String(data.code || "");
  const score = Number(data.confidence);
  const configuredThreshold = Number(env.KYC_FACE_MATCH_THRESHOLD);
  let threshold = 0.5;
  if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) {
    threshold =
      configuredThreshold > 1 ? configuredThreshold / 100 : configuredThreshold;
  }

  const mismatchMessage = "Your selfie does not match your Aadhaar photo.";

  if (normalizedCode === FACE_MATCH_DIFFERENT) {
    return {
      success: true,
      matched: false,
      confidence: Number.isFinite(score) ? score : null,
      code: normalizedCode,
      message: mismatchMessage,
    };
  }

  if (normalizedCode === FACE_MATCH_SAME && Number.isFinite(score)) {
    const matched = score >= threshold;
    return {
      success: true,
      matched,
      confidence: score,
      code: matched ? normalizedCode : "FACE_MISMATCH",
      message: matched
        ? data.message || "The two faces belong to the same person."
        : mismatchMessage,
    };
  }

  return {
    success: false,
    matched: false,
    code: normalizedCode || "FACE_MATCH_FAILED",
    message: formatFaceMatchUserMessage(
      data.message || "Unable to verify face match"
    ),
  };
};

module.exports = {
  ACCESS_GRANTED,
  ACCESS_DENIED,
  AUTH_URL_GENERATED,
  FACE_MATCH_SAME,
  shouldMockKyc,
  MOCK_JPEG_BASE64,
  normalizeMobile,
  normalizeBase64,
  initDigilocker,
  fetchEaadhaar,
  parseEaadhaar,
  verifyFaceMatch,
};
