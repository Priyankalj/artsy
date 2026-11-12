const { getFirebaseAdmin } = require("./firebase");
const { getTokenForUser, clearStaleToken } = require("../models/deviceTokens");
const { shouldMockThirdParties } = require("../utils/environment");

const toStringData = (data = {}) =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? "")])
  );

const sendToUser = async (userId, { title, body, data }) => {
  if (!userId) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const row = await getTokenForUser(userId);
    const token = row?.token;
    const admin = getFirebaseAdmin();

    if (!admin || !token) {
      if (shouldMockThirdParties()) {
        console.warn(
          `[push] mock deliver user=${userId} title="${title}" body="${body}" (no FCM admin/token)`
        );
        return { successCount: 1, failureCount: 0, mock: true };
      }
      return { successCount: 0, failureCount: 0 };
    }

    await admin.messaging().send({
      token,
      notification: { title, body },
      data: toStringData(data),
      android: { priority: "high" },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });
    return { successCount: 1, failureCount: 0 };
  } catch (error) {
    const code = error.code || "";
    if (
      code.includes("registration-token-not-registered") ||
      code.includes("invalid-argument")
    ) {
      const row = await getTokenForUser(userId);
      await clearStaleToken(row?.token);
    } else if (shouldMockThirdParties()) {
      console.warn(
        `[push] mock after FCM error user=${userId}: ${error.message}`
      );
      return { successCount: 1, failureCount: 0, mock: true };
    } else {
      console.warn("[push] sendToUser failed:", error.message);
    }
    return { successCount: 0, failureCount: 1 };
  }
};

module.exports = {
  sendToUser,
};
