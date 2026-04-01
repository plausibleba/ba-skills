// ─── PlausibleBA Lead Capture — Google Apps Script ──────────────────────────
// Paste this into Extensions → Apps Script in your Google Sheet.
// Deploy as: Web app → Execute as Me → Anyone can access
// Copy the deployment URL and add it as GSHEET_WEBHOOK_URL in Vercel.
//
// Sheet headers (Row 1):
// Timestamp | First Name | Last Name | Email | Generation # | Source

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.firstName || '',
    data.lastName || '',
    data.email || '',
    data.generation || '',
    data.source || 'canvas'
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Optional: test function to verify the sheet is working
function testAppend() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    new Date().toISOString(),
    'Test',
    'User',
    'test@example.com',
    1,
    'test'
  ]);
}
