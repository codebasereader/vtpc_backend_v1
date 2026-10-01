const { HttpError } = require("./errors");

function assertPassword(password, label = "Password") {
  const value = String(password || "");
  if (value.length < 8) {
    throw new HttpError(400, `${label} must be at least 8 characters`);
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new HttpError(400, `${label} must include at least one letter and one number`);
  }
  return value;
}

module.exports = { assertPassword };
