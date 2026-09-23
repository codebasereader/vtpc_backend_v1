const env = require("./env");

function sessionCookieOptions() {
  const sameSite = env.cookieSameSite;
  const secure = env.isProd || sameSite === "none";
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: env.sessionDays * 24 * 60 * 60 * 1000,
  };
}

module.exports = { sessionCookieOptions };
