/**
 * Hàm dùng chung giữa các job (Slack webhook, escape markdown, …).
 */

/**
 * Gửi nội dung text qua Slack Incoming Webhook (body JSON { "text": "..." }).
 *
 * @param {string} webhookUrl
 * @param {string} text
 * @return {{ ok: boolean, statusCode: number, body: string }}
 */
function slackPostText(webhookUrl, text) {
  var url = String(webhookUrl || "").trim();
  if (!url) {
    return { ok: false, statusCode: 0, body: "missing webhook URL" };
  }
  try {
    var resp = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({ text: text }),
    });
    var code = resp.getResponseCode();
    return {
      ok: code >= 200 && code < 300,
      statusCode: code,
      body: resp.getContentText(),
    };
  } catch (e) {
    return { ok: false, statusCode: 0, body: String(e) };
  }
}

/** Tránh ký tự * trong đoạn text sẽ bọc *bold* Slack. */
function slackEscapeBoldSegment(s) {
  return String(s).replace(/\*/g, "·");
}
