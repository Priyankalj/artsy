const fs = require("fs");
const path = require("path");
const env = require("../../env");

let admin = null;
let initialized = false;

const defaultKeyPath = path.join(
  __dirname,
  "../../firebaseadmin/serviceAccountKey.json"
);

const getKeyPath = () => {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return defaultKeyPath;
  }
  return path.isAbsolute(env.FIREBASE_SERVICE_ACCOUNT)
    ? env.FIREBASE_SERVICE_ACCOUNT
    : path.join(__dirname, "../..", env.FIREBASE_SERVICE_ACCOUNT);
};

const getFirebaseAdmin = () => {
  if (initialized) {
    return admin;
  }
  initialized = true;

  const keyPath = getKeyPath();
  if (!fs.existsSync(keyPath)) {
    console.warn(
      `[firebase] Service account file not found at ${keyPath}. Push is off until you add it.`
    );
    return null;
  }

  try {
    const { initializeApp, cert, getApps } = require("firebase-admin/app");
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    admin = require("firebase-admin");
    console.log("[firebase] Admin ready");
    return admin;
  } catch (error) {
    console.warn(
      `[firebase] Init failed (${error.message}). Push is off until the service account is valid.`
    );
    admin = null;
    return null;
  }
};

module.exports = { getFirebaseAdmin };
