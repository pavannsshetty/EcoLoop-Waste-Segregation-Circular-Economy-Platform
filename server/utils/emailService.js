const sendOtpEmail = async (email, name, otp) => {
  if (!process.env.BREVO_API_KEY) {
    console.log(`[OTP - DEV MODE] Email: ${email} | OTP: ${otp}`);
    return { messageId: 'dev-mode' };
  }

  try {
    const SibApiV3Sdk = require('sib-api-v3-sdk');
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = 'Your EcoLoop OTP Code';
    sendSmtpEmail.htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#16a34a;">EcoLoop</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your OTP verification code is:</p>
        <div style="background:#f1f5f9;padding:16px;text-align:center;border-radius:8px;margin:20px 0;">
          <span style="font-size:32px;font-weight:bold;color:#1e293b;letter-spacing:6px;">${otp}</span>
        </div>
        <p>This OTP expires in <strong>5 minutes</strong>.</p>
        <p style="color:#64748b;font-size:13px;">If you did not request this, ignore this email.</p>
      </div>
    `;
    sendSmtpEmail.sender = { name: 'EcoLoop', email: 'no-reply@ecoloop.in' };
    sendSmtpEmail.to = [{ email, name }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[OTP] Email sent:', data.messageId);
    return data;
  } catch (err) {
    console.error('[OTP] Email failed:', err.message);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

module.exports = { sendOtpEmail };
