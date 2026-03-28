var EXPIRY_SLACK_LAST_SENT_KEY = "LAST_EXPIRY_SLACK_DATE";

/**
 * Job: vào các thứ trong CONFIG.EXPIRY.SLACK_NOTIFY_WEEKDAYS — nếu có VPS hết hạn trong <= N ngày,
 * gửi 1 webhook Slack (tổng hợp), tối đa 1 lần/ngày.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function runExpirySlackNotificationIfDue(ss) {
  var webhook = CONFIG.SLACK && CONFIG.SLACK.WEBHOOK_URL;
  if (!webhook || String(webhook).trim() === "") {
    console.info("Expiry Slack: bỏ qua (chưa cấu hình WEBHOOK_URL).");
    return;
  }

  var notifyWeekdays = _getExpirySlackNotifyWeekdays_();
  if (notifyWeekdays.length === 0) {
    console.info("Expiry Slack: bỏ qua (EXPIRY.SLACK_NOTIFY_WEEKDAYS rỗng hoặc không hợp lệ).");
    return;
  }

  if (!_isExpirySlackNotifyWeekdayScriptTz(notifyWeekdays)) {
    return;
  }

  var skipDedup = CONFIG.DEBUG_SCRIPT === true;
  if (skipDedup) {
    console.warn(
      "Expiry Slack: DEBUG_SCRIPT=true — không khóa Slack theo ngày (chế độ test). Nhớ tắt trước production."
    );
  }

  var todayKey = _todayDateKeyScriptTz();
  var props = PropertiesService.getScriptProperties();
  if (!skipDedup && props.getProperty(EXPIRY_SLACK_LAST_SENT_KEY) === todayKey) {
    console.info("Expiry Slack: đã gửi hôm nay, bỏ qua.");
    return;
  }

  var threshold = (CONFIG.EXPIRY && CONFIG.EXPIRY.WARNING_DAYS) || 45;
  var defaultExpiryCol = (CONFIG.EXPIRY && CONFIG.EXPIRY.DATE_COLUMN) || "I";
  var defaultNameCol = (CONFIG.EXPIRY && CONFIG.EXPIRY.NAME_COLUMN) || "C";
  var lines = [];

  CONFIG.VPS_ACCOUNTS.forEach(function (account) {
    var sheet = ss.getSheetByName(account.sheetName);
    if (!sheet) {
      return;
    }
    var startRow = account.startRow;
    var lastRow = sheet.getLastRow();
    if (lastRow < startRow) {
      return;
    }

    var expiryCol = account.expiryColumn || defaultExpiryCol;
    var nameCol = account.nameColumn != null ? account.nameColumn : defaultNameCol;
    var ipCol = account.ipColumn;
    var expiryRange = sheet.getRange(expiryCol + startRow + ":" + expiryCol + lastRow);
    var nameRange = sheet.getRange(nameCol + startRow + ":" + nameCol + lastRow);
    var ipRange = sheet.getRange(ipCol + startRow + ":" + ipCol + lastRow);
    var expiryVals = expiryRange.getValues();
    var nameVals = nameRange.getValues();
    var ipVals = ipRange.getValues();

    for (var i = 0; i < expiryVals.length; i++) {
      var rowNum = startRow + i;
      var expiryDate = _parseExpiryCell(expiryVals[i][0]);
      if (!expiryDate) {
        continue;
      }
      var daysLeft = _wholeDaysUntil(expiryDate);
      if (daysLeft > threshold) {
        continue;
      }

      var ipLabel = String(ipVals[i][0] || "").trim() || "(không IP)";
      var rawName = String(nameVals[i][0] || "").trim();
      var nameSeg = rawName
        ? " — *" + slackEscapeBoldSegment(rawName) + "*"
        : "";
      var daysPart =
        daysLeft < 0
          ? "đã quá hạn *" + Math.abs(daysLeft) + "* ngày"
          : "còn *" + daysLeft + "* ngày";
      lines.push(
        "• `" +
          account.sheetName +
          "` row " +
          rowNum +
          nameSeg +
          " — IP " +
          ipLabel +
          " — hết hạn " +
          _formatDdMmYyyy(expiryDate) +
          " — " +
          daysPart
      );
    }
  });

  if (lines.length === 0) {
    console.info("Expiry Slack: không có VPS trong ngưỡng " + threshold + " ngày.");
    if (!skipDedup) {
      props.setProperty(EXPIRY_SLACK_LAST_SENT_KEY, todayKey);
    }
    return;
  }

  var spreadsheetUrl = ss.getUrl();
  var spreadsheetName = ss.getName();
  var text =
    ":warning: *VPS sắp hết hạn (≤ " +
    threshold +
    " ngày)* — " +
    todayKey +
    "\n" +
    lines.join("\n") +
    "\nRemark: " + `[${spreadsheetName}](${spreadsheetUrl})`;

  var result = slackPostText(webhook, text);
  if (result.ok) {
    if (!skipDedup) {
      props.setProperty(EXPIRY_SLACK_LAST_SENT_KEY, todayKey);
    }
    console.info("Expiry Slack: đã gửi " + lines.length + " dòng.");
  } else {
    console.error(
      "Expiry Slack: gửi thất bại — HTTP " +
        result.statusCode +
        " — " +
        String(result.body).substring(0, 200)
    );
  }
}

/** @param {*} value */
function _parseExpiryCell(value) {
  if (value == null || value === "") {
    return null;
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  var s = String(value).trim();
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) {
    return null;
  }
  var d = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10) - 1;
  var y = parseInt(m[3], 10);
  var dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

/** @param {Date} endDate */
function _wholeDaysUntil(endDate) {
  var tz = Session.getScriptTimeZone();
  var startStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  var endStr = Utilities.formatDate(endDate, tz, "yyyy-MM-dd");
  var start = new Date(startStr + "T12:00:00");
  var end = new Date(endStr + "T12:00:00");
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

/** @param {Date} d */
function _formatDdMmYyyy(d) {
  var tz = Session.getScriptTimeZone();
  return Utilities.formatDate(d, tz, "dd/MM/yyyy");
}

/**
 * Đọc từ CONFIG.EXPIRY.SLACK_NOTIFY_WEEKDAYS; bỏ qua property = mặc định [1] (Thứ Hai).
 * Cho phép một số hoặc mảng; chỉ giữ 1..7 (format "u" của Utilities.formatDate).
 * @returns {number[]}
 */
function _getExpirySlackNotifyWeekdays_() {
  var raw = CONFIG.EXPIRY && CONFIG.EXPIRY.SLACK_NOTIFY_WEEKDAYS;
  if (raw == null) {
    return [1];
  }
  var arr = Array.isArray(raw) ? raw : [raw];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var u = parseInt(arr[i], 10);
    if (u >= 1 && u <= 7) {
      out.push(u);
    }
  }
  return out;
}

/** @param {number[]} notifyWeekdays */
function _isExpirySlackNotifyWeekdayScriptTz(notifyWeekdays) {
  var tz = Session.getScriptTimeZone();
  var u = parseInt(Utilities.formatDate(new Date(), tz, "u"), 10);
  return notifyWeekdays.indexOf(u) !== -1;
}

function _todayDateKeyScriptTz() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}
