function doGet(e) {
  const action = String(e.parameter.action || "").trim();

  if (action === "submission") {
    return jsonResponse(getSubmission(e));
  }

  if (action === "all") {
    return jsonResponse(getAllSubmissions());
  }

  if (action === "getActuals") {
    return jsonResponse({ ok: true, data: readActualsFromSheet() });
  }

  return jsonResponse({ ok: false, error: "UNKNOWN_GET_ACTION" });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");

  if (payload.action === "savePartV2") {
    return jsonResponse(savePartV2(payload));
  }

  if (payload.action === "saveActual") {
    // server-side password check stored in Script Properties
    var SECRET = getAdminPassword();
    if (!SECRET) return jsonResponse({ ok: false, error: "ADMIN_PASSWORD_NOT_SET" });
    var pw = String(payload.password || "");
    if (pw !== SECRET) return jsonResponse({ ok: false, error: "INVALID_PASSWORD" });

    try {
      writeActualsToSheet(payload.data || {});
      return jsonResponse({ ok: true });
    } catch (err) {
      return jsonResponse({ ok: false, error: String(err) });
    }
  }

  return jsonResponse({ ok: false, error: "UNKNOWN_POST_ACTION" });
}

function savePartV2(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Submissions");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap(headers);

  const part = payload.part || "";
  const name = payload.name || "";
  const email = payload.email || "";
  let participantId = String(payload.participantId || "").trim();
  const now = new Date();

  const incomingData =
    payload.data ||
    payload.value ||
    payload.part1Json ||
    payload.part2Json ||
    payload.part3Json ||
    {};

  let rowNumber = findRow(data, idx.participantId, participantId);

  if (part === "part1" && (!name || !email)) {
    return { ok: false, error: "NAME_AND_EMAIL_REQUIRED" };
  }

  if (part !== "part1" && !participantId) {
    return { ok: false, error: "MISSING_PARTICIPANT_ID" };
  }

  if (!rowNumber && part !== "part1") {
    return { ok: false, error: "PARTICIPANT_NOT_FOUND" };
  }

  // ONLY create new row for part1
  if (!rowNumber && part === "part1") {
    participantId = Utilities.getUuid();

    const row = new Array(headers.length).fill("");
    row[idx.participantId] = participantId;
    row[idx.name] = name;
    row[idx.email] = email;
    row[idx.createdAt] = now;
    row[idx.updatedAt] = now;
    row[idx.part1SubmittedAt] = now;
    row[idx.part1Json] = JSON.stringify(incomingData);

    sheet.appendRow(row);

    return { ok: true, participantId: participantId };
  }

  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  row[idx.updatedAt] = now;

  if (part === "part1") {
    row[idx.name] = name;
    row[idx.email] = email;
    row[idx.part1SubmittedAt] = now;
    row[idx.part1Json] = JSON.stringify(incomingData);
  }

  if (part === "part2") {
    row[idx.part2SubmittedAt] = now;
    row[idx.part2Json] = JSON.stringify(incomingData);
  }

  if (part === "part3") {
    row[idx.part3SubmittedAt] = now;
    row[idx.part3Json] = JSON.stringify(incomingData);
  }

  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);

  return { ok: true, participantId: participantId };
}

function getSubmission(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Submissions");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idx = indexMap(headers);

  const id = String(e.parameter.participantId || "").trim();
  const rowNumber = findRow(rows, idx.participantId, id);

  if (!rowNumber) return { ok: false };

  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

  return {
    ok: true,
    submission: rowToObject(headers, row)
  };
}

function findRow(rows, colIndex, value) {
  const target = String(value || "").trim();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][colIndex] || "").trim() === target) {
      return i + 1;
    }
  }

  return null;
}

function indexMap(headers) {
  const map = {};
  headers.forEach(function (h, i) {
    map[h] = i;
  });
  return map;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach(function (h, i) {
    obj[h] = row[i];
  });
  return obj;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAllSubmissions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Submissions");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    headers.forEach((h, index) => {
      obj[h] = rows[i][index];
    });
    result.push(obj);
  }

  return { ok: true, data: result };
}

// ---- Actuals sheet helpers ----
// Admin password helpers: store/retrieve admin password in Script Properties
function setAdminPassword(newPassword) {
  if (!newPassword) return false;
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', String(newPassword));
  return true;
}

function getAdminPassword() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '';
}

function _setNested(obj, path, value) {
  var parts = path.split('.');
  var cur = obj;
  for (var i = 0; i < parts.length - 1; i++) {
    var p = parts[i];
    if (!cur[p]) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function readActualsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName('Actuals');
  if (!s) return {};
  var data = s.getDataRange().getValues();
  if (data.length <= 1) return {};
  var out = {};
  for (var i = 1; i < data.length; i++) {
    var section = String(data[i][0] || '').trim();
    var key = String(data[i][1] || '').trim();
    var val = data[i][2];
    if (val === '' || val === null || val === undefined) continue;
    var parsed = val;
    try { parsed = JSON.parse(String(val)); } catch (e) { parsed = String(val); }
    if (!section) continue;
    if (section === 'part2') {
      if (!out.part2) out.part2 = {};
      out.part2[key] = parsed;
    } else if (section === 'groups') {
      if (!out.groups) out.groups = {};
      out.groups[key] = parsed;
    } else if (section === 'knockout') {
      if (!out.knockout) out.knockout = {};
      out.knockout[key] = parsed;
    } else {
      var path = section + (key ? '.' + key : '');
      _setNested(out, path, parsed);
    }
  }
  return out;
}

function flattenActualsToRows(actuals) {
  var rows = [['section','key','value']];
  if (actuals.part2) {
    for (var k in actuals.part2) rows.push(['part2', k, typeof actuals.part2[k] === 'object' ? JSON.stringify(actuals.part2[k]) : String(actuals.part2[k])]);
  }
  if (actuals.groups) {
    for (var g in actuals.groups) rows.push(['groups', g, JSON.stringify(actuals.groups[g])]);
  }
  if (actuals.knockout) {
    for (var kk in actuals.knockout) rows.push(['knockout', kk, typeof actuals.knockout[kk] === 'object' ? JSON.stringify(actuals.knockout[kk]) : String(actuals.knockout[kk])]);
  }
  return rows;
}

function writeActualsToSheet(actuals) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName('Actuals');
  if (!s) s = ss.insertSheet('Actuals');
  var rows = flattenActualsToRows(actuals || {});
  s.clearContents();
  s.getRange(1,1,rows.length,3).setValues(rows);
}
