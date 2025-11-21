// // const { v4: uuidv4 } = require("uuid");

// // module.exports = function ensureSessionId(req, res, next) {
// //   // If authenticated user, no need for sessionId
// //   if (req.user && req.user.id) return next();

// //   const fromCookie = req.cookies && req.cookies.sessionId;
// //   const fromHeader = req.headers["x-session-id"];
// //   const fromBody = req.body && req.body.sessionId;
// //   const fromQuery = req.query && req.query.sessionId;

// //   let sessionId = fromCookie || fromHeader || fromBody || fromQuery;

// //   if (!sessionId) {
// //     sessionId = uuidv4();
// //     // set as httpOnly cookie
// //     // res.cookie("sessionId", sessionId, {
// //     //   httpOnly: true,
// //     //   secure: process.env.NODE_ENV === "production",
// //     //   sameSite: "lax",
// //     //   maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
// //     // });

// //     res.cookie("sessionId", sessionId, {
// //       httpOnly: true,
// //       secure: true,
// //       sameSite: "none",
// //       maxAge: 1000 * 60 * 60 * 24 * 30,
// //     });
// //   }

// //   req.sessionId = sessionId;
// //   next();
// // };

// const { v4: uuidv4 } = require("uuid");

// module.exports = function ensureSessionId(req, res, next) {
//   if (req.user && req.user.id) return next();

//   const fromCookie = req.cookies?.sessionId;
//   const fromHeader = req.headers["x-session-id"];
//   const fromBody = req.body?.sessionId;
//   const fromQuery = req.query?.sessionId;

//   let sessionId = fromCookie || fromHeader || fromBody || fromQuery;

//   if (!sessionId) {
//     sessionId = uuidv4();
//     // res.cookie("sessionId", sessionId, {
//     //   httpOnly: true,
//     //   secure: true, // HTTPS required on Koyeb
//     //   sameSite: "none", // Cross-domain safe
//     //   maxAge: 1000 * 60 * 60 * 24 * 30,
//     //   path: "/", // تبع كل المسارات
//     // });
//     res.cookie("sessionId", sessionId, {
//       httpOnly: false,
//       secure: false, // أثناء التطوير على localhost
//       sameSite: "lax", // أو "strict" أثناء التطوير
//       maxAge: 1000 * 60 * 60 * 24 * 30,
//     });
//   }

//   req.sessionId = sessionId;
//   next();
// };


const { v4: uuidv4 } = require("uuid");

module.exports = function ensureSessionId(req, res, next) {
  // If authenticated user, no need for sessionId
  if (req.user && req.user.id) return next();

  const fromCookie = req.cookies && req.cookies.sessionId;
  const fromHeader = req.headers["x-session-id"];
  const fromBody = req.body && req.body.sessionId;
  const fromQuery = req.query && req.query.sessionId;

  let sessionId = fromCookie || fromHeader || fromBody || fromQuery;

  if (!sessionId) {
    sessionId = uuidv4();

    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = req.secure ||
      (req.headers['x-forwarded-proto'] &&
        req.headers['x-forwarded-proto'] === 'https');

    // Set cookie with appropriate settings
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: isProduction || isHttps,  // true in production or when using HTTPS
      sameSite: isProduction ? "none" : "lax",  // 'none' in production, 'lax' in development
      maxAge: 1000 * 60 * 60 * 24 * 30,  // 30 days
      path: '/',  // Ensure cookie is available across all paths
      // domain: isProduction ? '.yourdomain.com' : undefined  // Set your production domain
    });
  }

  req.sessionId = sessionId;
  next();
};