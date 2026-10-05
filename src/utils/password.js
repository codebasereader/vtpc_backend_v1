const { HttpError } = require("./errors");

function assertPassword(password, label = "Password") {
  const value = String(password || "");
  if (value.length < 10) {
    throw new HttpError(400, `${label} must be at least 10 characters`);
  }
  if (value.length > 128) {
    throw new HttpError(400, `${label} must be 128 characters or fewer`);
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new HttpError(400, `${label} must include at least one letter and one number`);
  }
  return value;
}

module.exports = { assertPassword };
