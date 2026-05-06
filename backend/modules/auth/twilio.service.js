const twilio = require("twilio");

const getTwilioConfig = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || process.env.ACCOUNT_SID || "",
  authToken: process.env.TWILIO_AUTH_TOKEN || process.env.AUTH_TOKEN || "",
  verifyServiceSid:
    process.env.TWILIO_VERIFY_SERVICE_SID || process.env.VERIFY_SERVICE_SID || "",
});

const getTwilioClient = () => {
  const config = getTwilioConfig();

  if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
    return null;
  }

  return twilio(config.accountSid, config.authToken);
};

const isConfigured = () => {
  const config = getTwilioConfig();

  return Boolean(
    config.accountSid && config.authToken && config.verifyServiceSid,
  );
};

const sendVerificationCode = async (phoneNumber) => {
  const client = getTwilioClient();
  const config = getTwilioConfig();

  if (!client || !config.verifyServiceSid) {
    throw new Error("Twilio Verify is not configured.");
  }

  return client.verify.v2
    .services(config.verifyServiceSid)
    .verifications.create({
      to: phoneNumber,
      channel: "sms",
    });
};

const checkVerificationCode = async (phoneNumber, code) => {
  const client = getTwilioClient();
  const config = getTwilioConfig();

  if (!client || !config.verifyServiceSid) {
    throw new Error("Twilio Verify is not configured.");
  }

  return client.verify.v2
    .services(config.verifyServiceSid)
    .verificationChecks.create({
      to: phoneNumber,
      code,
    });
};

module.exports = {
  checkVerificationCode,
  getTwilioConfig,
  isConfigured,
  sendVerificationCode,
};
