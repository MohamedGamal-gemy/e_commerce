// middlewares/guestSession.js
const { v4: uuidv4 } = require("uuid");

exports.guestSession = (req, res, next) => {
  let sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    sessionId = uuidv4();

    const isProduction = process.env.NODE_ENV === "production";
    const isHttps =
      req.secure ||
      req.headers["x-forwarded-proto"] === "https";

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: isProduction || isHttps,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  req.sessionId = sessionId;
  next();
};
