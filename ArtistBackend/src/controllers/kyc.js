const fs = require("fs");
const path = require("path");
const { StatusCodes } = require("http-status-codes");
const env = require("../../env");
const asyncWrapper = require("../middlewares/async");
const CustomError = require("../errors/custom-error");
const { findUserById } = require("../models/auth");
const { getArtistByUserId } = require("../models/artists");
const {
  DOC_TYPES,
  createDocument,
  getLatestDocumentForUser,
} = require("../models/documents");
const {
  getKycRow,
  saveDigilockerSession,
  getUserByTransactionId,
  markDigilockerComplete,
  markSelfieMatched,
  markArtistVerified,
  toPublicStatus,
  isDigilockerDone,
} = require("../models/kyc");
const {
  ACCESS_GRANTED,
  ACCESS_DENIED,
  shouldMockKyc,
  MOCK_JPEG_BASE64,
  initDigilocker,
  fetchEaadhaar,
  parseEaadhaar,
  verifyFaceMatch,
} = require("../services/gridlines");
const { saveBase64File, saveUploadedFile } = require("../utils/fileUtils");
const { buildAuthenticatedFileUrl } = require("../utils/mediaUrls");
const { createJWT } = require("../utils/jwt");
const { shouldMockThirdParties } = require("../utils/environment");

const APP_DEEP_LINK = env.DIGILOCKER_APP_REDIRECT || "artsy://kyc/digilocker";

const getCallbackUrl = (req) => {
  if (env.DIGILOCKER_REDIRECT_URI) {
    return env.DIGILOCKER_REDIRECT_URI;
  }
  const host = env.PUBLIC_BASE_URL
    ? String(env.PUBLIC_BASE_URL).replace(/\/$/, "")
    : `${req.protocol}://${req.get("host")}`;
  return `${host}/api/kyc/digilocker/callback`;
};

const appRedirect = (status, message) => {
  const params = new URLSearchParams({ status });
  if (message) {
    params.set("message", String(message).slice(0, 300));
  }
  return `${APP_DEEP_LINK}?${params.toString()}`;
};

const persistAadhaarPhoto = async (userId, photoBase64) => {
  const artist = await getArtistByUserId(userId);
  const saved = saveBase64File(
    photoBase64 || MOCK_JPEG_BASE64,
    `kyc/${userId}/aadhaar`,
    "aadhaar.jpg"
  );
  await createDocument({
    userId,
    artistId: artist?.artist_id || null,
    documentType: DOC_TYPES.AADHAAR_PHOTO,
    filePath: saved.path,
    mimeType: "image/jpeg",
    fileSize: saved.size,
  });
  return saved.path;
};

const persistDigilockerResult = async (userId, transactionId) => {
  const eaadhaarResult = await fetchEaadhaar(transactionId, {
    reference_id: `kyc-${userId}`,
  });
  const parsed = parseEaadhaar(eaadhaarResult?.eaadhaar) || {};
  if (!parsed.photo && !shouldMockKyc()) {
    return {
      success: false,
      message:
        "Aadhaar photo was not received from DigiLocker. Please try again.",
    };
  }

  await persistAadhaarPhoto(userId, parsed.photo);
  const user = await markDigilockerComplete(userId, {
    aadhaarLast4: parsed.aadhaarLast4,
    aadhaarName: parsed.name,
  });
  return { success: true, user };
};

const fetchKycStatus = asyncWrapper(async (req, res, next) => {
  const row = await getKycRow(req.authuser.user_id);
  if (!row) {
    return next(
      new CustomError(null, "User not found", StatusCodes.NOT_FOUND, "Functional")
    );
  }
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "KYC status fetched",
    data: toPublicStatus(row),
  });
});

const initDigilockerRequest = asyncWrapper(async (req, res, next) => {
  const user = await findUserById(req.authuser.user_id);
  if (!user) {
    return next(
      new CustomError(null, "User not found", StatusCodes.NOT_FOUND, "Functional")
    );
  }

  const current = await getKycRow(user.user_id);
  if (isDigilockerDone(current?.verification_status)) {
    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        already_verified: true,
        authorization_url: null,
        ...toPublicStatus(current),
      },
    });
  }

  const result = await initDigilocker({
    redirect_uri: getCallbackUrl(req),
    mobile_number: user.phone,
    reference_id: `kyc-${user.user_id}`,
  });

  if (!result.success) {
    return next(
      new CustomError(
        null,
        result.message || "Unable to start DigiLocker",
        StatusCodes.BAD_REQUEST,
        result.code || "DIGILOCKER_INIT_FAILED"
      )
    );
  }

  await saveDigilockerSession(user.user_id, result.transaction_id);

  if (result.bypass || shouldMockKyc()) {
    const persisted = await persistDigilockerResult(
      user.user_id,
      result.transaction_id
    );
    if (!persisted.success) {
      return next(
        new CustomError(
          null,
          persisted.message,
          StatusCodes.BAD_REQUEST,
          "DIGILOCKER_MOCK_FAILED"
        )
      );
    }
    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        already_verified: false,
        authorization_url: null,
        bypass: true,
        ...toPublicStatus(persisted.user),
      },
    });
  }

  return res.status(StatusCodes.OK).json({
    success: true,
    data: {
      already_verified: false,
      authorization_url: result.authorization_url,
      transaction_id: result.transaction_id,
      bypass: false,
    },
  });
});

const digilockerCallback = asyncWrapper(async (req, res) => {
  const { code, transaction_id, message, error: queryError } = req.query;
  if (!transaction_id) {
    return res.redirect(appRedirect("denied", "Missing DigiLocker transaction"));
  }

  const sessionUser = await getUserByTransactionId(String(transaction_id));
  if (!sessionUser) {
    return res.redirect(appRedirect("denied", "DigiLocker session not found"));
  }

  const statusCode = String(code || "");
  const errorCode = String(queryError || message || "").toUpperCase();
  if (
    statusCode === ACCESS_DENIED ||
    errorCode.includes("TRANSACTION_ALREADY_COMPLETED")
  ) {
    return res.redirect(appRedirect("denied", "DigiLocker access was not completed"));
  }

  if (statusCode && statusCode !== ACCESS_GRANTED) {
    return res.redirect(appRedirect("denied", message || "DigiLocker access was not completed"));
  }

  try {
    const persisted = await persistDigilockerResult(
      sessionUser.user_id,
      String(transaction_id)
    );
    if (!persisted.success) {
      return res.redirect(appRedirect("error", persisted.message));
    }
    const token = createJWT({
      user_id: sessionUser.user_id,
      phone: sessionUser.phone,
    });
    return res.redirect(
      `${APP_DEEP_LINK}?status=success&authmode=${encodeURIComponent(token)}`
    );
  } catch (error) {
    return res.redirect(appRedirect("error", error.message));
  }
});

const verifySelfieFaceMatch = asyncWrapper(async (req, res, next) => {
  const userId = req.authuser.user_id;
  const kyc = await getKycRow(userId);
  if (!isDigilockerDone(kyc?.verification_status) && !shouldMockKyc()) {
    return next(
      new CustomError(
        null,
        "Complete DigiLocker verification first so we can match your selfie with your Aadhaar photo.",
        StatusCodes.BAD_REQUEST,
        "AADHAAR_PHOTO_MISSING"
      )
    );
  }

  if (!req.files || !req.files.file) {
    return next(
      new CustomError(null, "Selfie is required", StatusCodes.BAD_REQUEST, "validation")
    );
  }

  const file = req.files.file;
  if (file.size < 1024 || file.size > 6 * 1024 * 1024) {
    return next(
      new CustomError(
        null,
        "Selfie must be between 1 KB and 6 MB",
        StatusCodes.BAD_REQUEST,
        "validation"
      )
    );
  }

  const artist = await getArtistByUserId(userId);
  const saved = await saveUploadedFile(file, `kyc/${userId}/selfie`);
  await createDocument({
    userId,
    artistId: artist?.artist_id || null,
    documentType: DOC_TYPES.SELFIE,
    filePath: saved.path,
    mimeType: saved.mimetype,
    fileSize: saved.size,
  });

  const aadhaarDoc = await getLatestDocumentForUser(
    userId,
    DOC_TYPES.AADHAAR_PHOTO
  );
  if (!aadhaarDoc?.file_path && !shouldMockKyc()) {
    return next(
      new CustomError(
        null,
        "We could not find your Aadhaar photo from DigiLocker. Please complete DigiLocker again.",
        StatusCodes.BAD_REQUEST,
        "AADHAAR_PHOTO_MISSING"
      )
    );
  }

  let aadhaarBase64 = MOCK_JPEG_BASE64;
  if (aadhaarDoc?.file_path) {
    const abs = path.join(__dirname, "../..", aadhaarDoc.file_path);
    if (fs.existsSync(abs)) {
      aadhaarBase64 = fs.readFileSync(abs).toString("base64");
    }
  }

  const selfieBase64 = fs
    .readFileSync(path.join(__dirname, "../..", saved.path))
    .toString("base64");

  const matchResult = await verifyFaceMatch({
    selfieBase64,
    documentBase64: aadhaarBase64,
    reference_id: `selfie-${userId}`,
  });

  if (!matchResult.success) {
    return next(
      new CustomError(
        null,
        matchResult.message || "Face match verification failed",
        StatusCodes.BAD_REQUEST,
        matchResult.code || "FACE_MATCH_FAILED"
      )
    );
  }

  if (!matchResult.matched) {
    return next(
      new CustomError(
        null,
        matchResult.message || "Your selfie does not match your Aadhaar photo.",
        StatusCodes.BAD_REQUEST,
        "FACE_MISMATCH"
      )
    );
  }

  const user = await markSelfieMatched(userId);
  const verified = shouldMockThirdParties() || user.verification_status === "approved";
  if (artist) {
    await markArtistVerified(userId, verified);
  }

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Selfie verified successfully",
    data: {
      matched: true,
      confidence: matchResult.confidence,
      mock: Boolean(matchResult.mock),
      documentUrl: saved.path,
      fullDocumentUrl: buildAuthenticatedFileUrl(saved.path, req),
      user,
      ...toPublicStatus(user),
    },
  });
});

module.exports = {
  fetchKycStatus,
  initDigilockerRequest,
  digilockerCallback,
  verifySelfieFaceMatch,
};
