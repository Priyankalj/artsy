const { StatusCodes } = require("http-status-codes");
const asyncWrapper = require("../middlewares/async");
const {
  saveDeviceToken,
  deleteDeviceToken,
} = require("../models/deviceTokens");

const registerDeviceToken = asyncWrapper(async (req, res) => {
  const record = await saveDeviceToken({
    userId: req.authuser.user_id,
    token: req.body.token,
    platform: req.body.platform,
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Device registered for notifications",
    data: { token: record.token, platform: record.platform },
  });
});

const unregisterDeviceToken = asyncWrapper(async (req, res) => {
  await deleteDeviceToken({
    userId: req.authuser.user_id,
    token: req.body.token || null,
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Device unregistered",
  });
});

module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
};
