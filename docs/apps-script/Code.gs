/**
 * Shift Companion → Google Sheets receiver.
 *
 * Setup: open your Google Sheet → Extensions → Apps Script → paste this file →
 * set SECRET below → Deploy → New deployment → type "Web app" →
 * Execute as: Me, Who has access: Anyone → copy the /exec URL into the app (Rules tab).
 * See docs/APPS-SCRIPT.md for the full walkthrough.
 */
const SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';
const SHEET_NAME = 'Shifts';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!body || body.key !== SECRET) return reply({ ok: false, error: 'Wrong secret' });
    const rows = body.rows;
    if (!Array.isArray(rows) || !rows.length) return reply({ ok: false, error: 'No rows' });

    const width = Math.max.apply(null, rows.map(r => r.length));
    const grid = rows.map(r => r.concat(new Array(width - r.length).fill('')));

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    sheet.clearContents();
    sheet.getRange(1, 1, grid.length, width).setValues(grid);
    sheet.setFrozenRows(1);
    return reply({ ok: true, rows: grid.length });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
