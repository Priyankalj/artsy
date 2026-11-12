const axios = require("axios");
const env = require("../../env");
const {
  isDevLike,
  shouldCallExternalServices,
} = require("../utils/environment");

const MSG91_OTP_URL = "https://control.msg91.com/api/v5/otp";
const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow";
const MSG91_EMAIL_URL = "https://control.msg91.com/api/v5/email/send";

const toMsg91Mobile = (phone) => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

const isOtpSmsConfigured = () =>
  Boolean(env.MSG91_AUTH_KEY && env.MSG91_OTP_TEMPLATE_ID);

const isBookingSmsConfigured = () =>
  Boolean(env.MSG91_AUTH_KEY && env.MSG91_BOOKING_TEMPLATE_ID);

const isEmailConfigured = () =>
  Boolean(
    env.MSG91_AUTH_KEY &&
      env.MSG91_EMAIL_TEMPLATE_ID &&
      env.FROM_EMAIL &&
      env.MSG_MAIL_DOMAIN
  );

const msg91Headers = () => ({
  authkey: env.MSG91_AUTH_KEY,
  "content-type": "application/json",
  accept: "application/json",
});

const assertMsg91Ok = (data, fallback) => {
  const type = String(data?.type || "").toLowerCase();
  if (type && type !== "success") {
    throw new Error(data?.message || fallback);
  }
};

const skipVendor = (channel, reason) => {
  console.warn(`[msg91] ${channel} skipped — ${reason}`);
  return { skipped: true, reason };
};

/**
 * OTP SMS — Floatr pattern: never call MSG91 unless PROD (or FORCE_EXTERNAL_SERVICES).
 * DEV still succeeds so login works with hardcoded OTP + API reveal.
 */
const sendOtpSms = async (phone, otp) => {
  if (!shouldCallExternalServices()) {
    return skipVendor(
      "OTP SMS",
      `ENVIRONMENT is not PROD (otp=${otp}, phone=${phone})`
    );
  }

  if (!isOtpSmsConfigured()) {
    throw new Error("SMS is not configured");
  }

  const mobile = toMsg91Mobile(phone);
  const { data } = await axios.post(
    MSG91_OTP_URL,
    {
      template_id: env.MSG91_OTP_TEMPLATE_ID,
      mobile,
      otp: String(otp),
      otp_expiry: env.OTP_EXPIRY || 5,
      sender: env.MSG91_SENDER_ID || undefined,
    },
    {
      headers: msg91Headers(),
      timeout: 10000,
    }
  );
  assertMsg91Ok(data, "MSG91 OTP send failed");
  return { skipped: false, data };
};

const sendBookingSms = async (phone, { title, body, name, date, status, artist }) => {
  if (!phone) {
    return { skipped: true };
  }

  if (!shouldCallExternalServices()) {
    return skipVendor("booking SMS", "ENVIRONMENT is not PROD");
  }

  if (!isBookingSmsConfigured()) {
    return { skipped: true };
  }

  try {
    const { data } = await axios.post(
      MSG91_FLOW_URL,
      {
        template_id: env.MSG91_BOOKING_TEMPLATE_ID,
        short_url: "0",
        recipients: [
          {
            mobiles: toMsg91Mobile(phone),
            name: name || "",
            date: date || "",
            status: status || "",
            artist: artist || "",
            title: title || "",
            message: body || "",
            var1: body || title || "",
            var2: date || status || "",
          },
        ],
      },
      {
        headers: msg91Headers(),
        timeout: 10000,
      }
    );
    assertMsg91Ok(data, "MSG91 booking SMS failed");
    return { skipped: false, data };
  } catch (error) {
    console.warn("[msg91] booking SMS failed:", error.message);
    return { skipped: false, failed: true };
  }
};

const sendBookingEmail = async (
  email,
  { title, body, name, date, status, artist }
) => {
  if (!email) {
    return { skipped: true };
  }

  if (!shouldCallExternalServices()) {
    return skipVendor("booking email", "ENVIRONMENT is not PROD");
  }

  if (!isEmailConfigured()) {
    return { skipped: true };
  }

  try {
    const { data } = await axios.post(
      MSG91_EMAIL_URL,
      {
        recipients: [
          {
            to: [{ email, name: name || email }],
            variables: {
              name: name || "",
              date: date || "",
              status: status || "",
              artist: artist || "",
              title: title || "",
              message: body || "",
            },
          },
        ],
        from: { email: env.FROM_EMAIL },
        domain: env.MSG_MAIL_DOMAIN,
        template_id: env.MSG91_EMAIL_TEMPLATE_ID,
      },
      {
        headers: msg91Headers(),
        timeout: 10000,
      }
    );
    assertMsg91Ok(data, "MSG91 email failed");
    return { skipped: false, data };
  } catch (error) {
    console.warn("[msg91] booking email failed:", error.message);
    return { skipped: false, failed: true };
  }
};

module.exports = {
  sendOtpSms,
  sendBookingSms,
  sendBookingEmail,
  isOtpSmsConfigured,
  isDevLike,
};
