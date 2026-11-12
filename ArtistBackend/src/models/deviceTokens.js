const { pool } = require("./db");

/**
 * One phone address per user (Floatr-style).
 * If this phone was tied to someone else, that old login is cleared first
 * so they stop getting notifications.
 */
const saveDeviceToken = async ({ userId, token, platform }) => {
  await pool.query(
    `UPDATE users
     SET device_token = NULL,
         device_platform = NULL,
         updated_at = NOW()
     WHERE device_token = $1 AND user_id <> $2`,
    [token, userId]
  );

  const { rows } = await pool.query(
    `UPDATE users
     SET device_token = $2,
         device_platform = $3,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING user_id, device_token AS token, device_platform AS platform`,
    [userId, token, platform]
  );
  return rows[0];
};

const deleteDeviceToken = async ({ userId, token }) => {
  if (token) {
    await pool.query(
      `UPDATE users
       SET device_token = NULL,
           device_platform = NULL,
           updated_at = NOW()
       WHERE user_id = $1 AND device_token = $2`,
      [userId, token]
    );
    return;
  }
  await pool.query(
    `UPDATE users
     SET device_token = NULL,
         device_platform = NULL,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
};

const clearStaleToken = async (token) => {
  if (!token) {
    return;
  }
  await pool.query(
    `UPDATE users
     SET device_token = NULL,
         device_platform = NULL,
         updated_at = NOW()
     WHERE device_token = $1`,
    [token]
  );
};

const getTokenForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT device_token AS token, device_platform AS platform
     FROM users WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.token ? rows[0] : null;
};

module.exports = {
  saveDeviceToken,
  deleteDeviceToken,
  clearStaleToken,
  getTokenForUser,
};
