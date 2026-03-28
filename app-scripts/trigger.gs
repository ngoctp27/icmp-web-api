function test() {
  CONFIG.DEBUG_SCRIPT = true
  monitorAllVPS();
}

/**
 * Xóa khóa Script Property "đã gửi Slack expiry hôm nay" để test lại **một lần**
 * mà vẫn giữ DEBUG_SCRIPT = false (hành vi giống production).
 * Project settings → Script properties: cũng có thể xóa key LAST_EXPIRY_SLACK_DATE thủ công.
 */
function clearExpirySlackLastSentDate() {
  PropertiesService.getScriptProperties().deleteProperty("LAST_EXPIRY_SLACK_DATE");
  console.info("Đã xóa LAST_EXPIRY_SLACK_DATE — lần chạy kế có thể gửi Slack lại nếu đúng thứ & có VPS trong ngưỡng.");
}

function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('monitorAllVPS')
    .timeBased()
    .everyHours(1)
    .create();
}