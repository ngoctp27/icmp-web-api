/**
 * Entry duy nhất: chạy tuần tự các job (ping, expiry Slack, …).
 * Thêm chức năng mới: tạo hàm `runXxx(ss)` và đăng ký vào MONITOR_JOBS.
 */

const MONITOR_JOBS = [
  { name: "pingSheets", run: runPingMonitoring },
  { name: "expirySlack", run: runExpirySlackNotificationIfDue },
];

function monitorAllVPS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  MONITOR_JOBS.forEach((job) => {
    try {
      job.run(ss);
    } catch (e) {
      console.error(`Job ${job.name} lỗi: ${e}`);
    }
  });

  console.info("Hoàn tất monitorAllVPS.");
}
