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
    // set as httpOnly cookie
    // res.cookie("sessionId", sessionId, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "lax",
    //   maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    // });

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite:  "none" ,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  req.sessionId = sessionId;
  next();
};
