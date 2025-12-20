const nodemailer = require("nodemailer");

// const sendOrderEmail = async (email, order) => {
//   // إعداد Resend عبر SMTP
//   const transporter = nodemailer.createTransport({
//     host: "smtp.resend.com",
//     secure: true,
//     port: 465,
//     auth: {
//       user: "resend", // هذا الاسم ثابت دائماً مع Resend
//       pass: process.env.RESEND_API_KEY, // هنا تضع الـ API Key الخاص بك
//     },
//   });

//   const mailOptions = {
//     // from: "Your Store <onboarding@resend.dev>", // في البداية استخدم هذا الإيميل التجريبي
//     from: "Your Store <onboarding@resend.dev>", // في البداية استخدم هذا الإيميل التجريبي
//     to: email,
//     subject: `Order Confirmed - #${order._id.toString().slice(-6)}`,
//     html: `
//       <div style="font-family: Arial, sans-serif; color: #333;">
//         <h2 style="color: #0ea5e9;">Thanks for your order!</h2>
//         <p>Order ID: <b>${order._id}</b></p>
//         <p>Amount: <b>${order.payment.amount_paid} EGP</b></p>
//         <hr />
//         <p>We are processing your items now.</p>
//       </div>
//     `,
//   };

//   return transporter.sendMail(mailOptions);
// };

// module.exports = sendOrderEmail;

const sendOrderEmail = async (email, order, type = "confirmed") => {
  const subject =
    type === "shipped"
      ? `Your Order #${order.orderNumber} has been shipped! 🚚`
      : `Order Confirmed - #${order.orderNumber}`;

  const htmlContent =
    type === "shipped"
      ? `<h2>Great news, ${order.billingDetails.fullName}!</h2>
       <p>Your order is on its way to you.</p>
       <p>Order Number: <b>${order.orderNumber}</b></p>
       <p>Track your package or contact us if you have questions.</p>`
      : `<h2>Thanks for your order!</h2>
       <p>Amount Paid: <b>${order.payment.amount_paid} EGP</b></p>`;

  const mailOptions = {
    from: "Your Store <onboarding@resend.dev>",
    to: email, // في الـ testing استخدم إيميلك المسجل في Resend
    subject: subject,
    html: `<div style="font-family: sans-serif;">${htmlContent}</div>`,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = sendOrderEmail;
