/**
 * Job: ICMP qua API — chỉ trách nhiệm đọc IP, ping, ghi status + J1.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function runPingMonitoring(ss) {
  CONFIG.VPS_ACCOUNTS.forEach(function (account) {
    const sheet = ss.getSheetByName(account.sheetName);
    if (!sheet) {
      console.warn("Sheet không tồn tại: " + account.sheetName);
      return;
    }

    const ipColumn = account.ipColumn;
    const statusColumn = account.statusColumn;
    const startRow = account.startRow;
    const lastRow = sheet.getLastRow();
    if (lastRow < startRow) {
      console.info("Không có dữ liệu: " + account.sheetName);
      return;
    }

    try {
      const ipRange = sheet.getRange(ipColumn + startRow + ":" + ipColumn + lastRow);
      const ipValues = ipRange.getValues().flat();

      const validItems = ipValues
        .map(function (ip, idx) {
          return { ip: ip.toString().trim(), row: startRow + idx };
        })
        .filter(function (item) {
          return isValidIPv4(item.ip);
        });

      if (validItems.length === 0) {
        console.info("Không có IP hợp lệ: " + account.sheetName);
        return;
      }

      const validIPs = validItems.map(function (item) {
        return item.ip;
      });
      const batches = chunkArray(validIPs, CONFIG.BATCH_SIZE);
      let updatedCount = 0;

      batches.forEach(function (batch, batchIdx) {
        console.info("Ping batch " + (batchIdx + 1) + "/" + batches.length + " - " + account.sheetName);

        const results = pingBatchSync(batch);
        const statusUpdates = new Array(ipValues.length).fill([""]);
        results.forEach(function (r) {
          const item = validItems.find(function (v) {
            return v.ip === r.ip;
          });
          if (item) {
            const idx = item.row - startRow;
            statusUpdates[idx] = [r.isOnline ? "ONLINE" : "OFFLINE"];
            updatedCount++;
          }
        });

        const statusRange = sheet.getRange(statusColumn + startRow + ":" + statusColumn + lastRow);
        const currentValues = statusRange.getValues();
        const merged = currentValues.map(function (row, idx) {
          return statusUpdates[idx][0] !== "" ? statusUpdates[idx] : row;
        });
        statusRange.setValues(merged);

        if (batchIdx < batches.length - 1) {
          sleep(CONFIG.DELAY_BETWEEN_BATCH);
        }
      });

      const nowICT = getCurrentICTTime();
      sheet.getRange("J1").setValue("Updated at: " + nowICT + " ICT");
      console.info("Hoàn tất " + account.sheetName + ": " + updatedCount + " VPS");
    } catch (error) {
      console.error("Lỗi khi xử lý " + account.sheetName + ":", error.toString());
      sheet.getRange("J1").setValue("Lỗi: " + error.toString().substring(0, 50) + "...");
    }
  });

  console.info("Hoàn tất job ping monitoring.");
}
