const CONFIG = {
  // true = dev/test: bỏ chống trùng Slack expiry (gửi lại mỗi lần chạy khi đúng thứ) + dùng cho log/tính năng debug khác. Production = false.
  DEBUG_SCRIPT: false,

  PING_SERVER: {
    URL: "https://ping-icmp.example.com/ping",
    USERNAME: "admin",
    PASSWORD: "Secr3t@123"
  },

  VPS_ACCOUNTS: [
    {
      sheetName: "Hostinger-VPS-dev",
      ipColumn: "F",
      statusColumn: "J",
      startRow: 4,
      expiryColumn: "I", // mặc định EXPIRY.DATE_COLUMN
      nameColumn: "C", // mặc định EXPIRY.NAME_COLUMN (tên VPS cho Slack)
    }
  ],

  // TỐI ƯU: 10 IP/batch, delay 1s giữa batch
  BATCH_SIZE: 10,
  DELAY_BETWEEN_BATCH: 1000,

  // Cảnh báo hết hạn VPS → Slack (chỉ GAS). Cột ngày format DD/MM/YYYY.
  EXPIRY: {
    DATE_COLUMN: "I",
    NAME_COLUMN: "C", // Tên VPS (notify Slack)
    WARNING_DAYS: 45,
    // Ngày trong tuần được phép gửi Slack (theo timezone script — Utilities format "u"):
    // 1 = Thứ Hai, 2 = Thứ Ba, …, 6 = Thứ Bảy, 7 = Chủ nhật. Có thể nhiều thứ: [1, 4, 5]
    SLACK_NOTIFY_WEEKDAYS: [1],
  },

  SLACK: {
    WEBHOOK_URL: "",
  },
};