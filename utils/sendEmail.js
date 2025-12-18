const nodemailer = require("nodemailer");

const sendOrderEmail = async (email, order) => {
  // إعداد Resend عبر SMTP
  const transporter = nodemailer.createTransport({
    host: "smtp.resend.com",
    secure: true,
    port: 465,
    auth: {
      user: "resend", // هذا الاسم ثابت دائماً مع Resend
      pass: process.env.RESEND_API_KEY, // هنا تضع الـ API Key الخاص بك
    },
  });

  const mailOptions = {
    from: "Your Store <onboarding@resend.dev>", // في البداية استخدم هذا الإيميل التجريبي
    to: email,
    subject: `Order Confirmed - #${order._id.toString().slice(-6)}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #0ea5e9;">Thanks for your order!</h2>
        <p>Order ID: <b>${order._id}</b></p>
        <p>Amount: <b>${order.payment.amount_paid} EGP</b></p>
        <hr />
        <p>We are processing your items now.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = sendOrderEmail;
