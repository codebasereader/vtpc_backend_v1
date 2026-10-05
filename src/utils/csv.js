// CSV cell escaping for exports that admins open in Excel / Sheets.
//
// A cell that starts with = + - @ (or a tab / carriage return) is run as a
// formula by spreadsheet programs. Some exported text comes from the public
// (e.g. a newsletter subscriber's email), so such cells get a leading
// apostrophe, which makes the program show them as plain text.
function csvCell(value) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

module.exports = { csvCell };
