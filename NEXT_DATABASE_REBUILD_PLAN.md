# Next Database Rebuild Plan

目標：下一輪只重算目前報告中最需要修正的統計，避免全表暴力 join。所有輸出最後合併回 `apps/report/src/report-data.generated.json`，再更新報告文字與圖表。

## 1. 電量門檻與真正不可借率

目的：回答「所有車輛中，有多少比例因電量或狀態不能借」，而不是目前的風險訊號比例。

資料來源：

- `scooter_info_observations`
  - `observed_at`
  - `imei`
  - `is_active`
  - `account_id`
  - `scooter_rental_station_id`
- `scooter_status_observations`
  - `observed_at`
  - `imei`
  - `power`
  - `error_msg`
  - `fault_status`
  - `gps_number`
  - `latitude`
  - `longitude`

建議方法：

- 以 Timescale chunk 分批處理，不做全期間一次性 join。
- 先把兩張表各自彙整成 `imei + 1 minute bucket`。
- 只保留在清大/交大站點內、非租借中的車輛。
- 以 `power` 每 5% 或 10% 分組，計算：
  - 總車輛觀測數
  - 不可借車輛觀測數
  - 不可借率
  - 95% 信賴區間
  - errorMsg 比例
- 另外測試候選門檻：30%、35%、40%。

預期輸出：

- `batteryAvailabilityBands`
- `batteryThresholdCandidates`

報告用途：

- 重畫 Q4 圖表，y 軸改成「不可借率」。
- 結論中回答「沒電造成的比例」與「可能門檻」。

## 2. 缺車恢復分類：大量回補、一般歸還、換電池/修復

目的：修正目前「疑似大量回補」過於粗略的問題。

資料來源：

- `station_scooter_counts`
  - `station_id`
  - `observed_at`
  - `scooter_count`
  - `available_scooter_count`
- `scooter_info_observations`
  - `observed_at`
  - `imei`
  - `scooter_rental_station_id`
  - `is_active`
  - `account_id`
- `scooter_status_observations`
  - `observed_at`
  - `imei`
  - `power`
  - `error_msg`
  - `fault_status`

建議方法：

- 先用站點 1 分鐘資料找缺車 episode 與恢復時間。
- 只針對恢復前後窗口查車輛資料，例如 `recovery_time - 10 minutes` 到 `recovery_time + 10 minutes`。
- 分類規則初稿：
  - 大量回補：站點總車數增加 >= 5，且出現多台新 imei。
  - 換電池/修復：站點總車數沒有明顯增加，但同站同 imei 從低電或 error 變成可借。
  - 一般歸還：總車數小幅增加，新增 imei 數量少於大量回補門檻。
  - 混合/未知：同時符合多種訊號或資料不足。

預期輸出：

- `recoveryClassSummary`
- `recoveryClassByCampus`
- `recoveryClassByStation`
- `recoveryExamples`

報告用途：

- 重寫 Q5，回答「缺車後是營運補車、使用者還車，還是換電後恢復」。

## 3. 借車策略的站點集中度

目的：避免校區總車數讓讀者誤解「晚上到處都有車」。

資料來源：

- `station_scooter_counts`
- `static_endpoint_items`

建議方法：

- 使用既有 `station_15m` 聚合即可，成本低。
- 依校區、星期、時段計算：
  - 可借車 >= 1 的站點數
  - 可借車 >= 3 的站點數
  - 可借車 >= 5 的站點數
  - 前三大站點占校區可借車比例
  - Gini 或集中度指標

預期輸出：

- `availabilityDispersionByHour`
- `topStationShareByHour`

報告用途：

- 補強 Q1：區分「校區總量」與「附近站點是否真的有車」。

## 4. 課程方法補強：信賴區間與多組比較

目的：讓報告更貼近課程內容中的單樣本/雙樣本決策、ANOVA、多重比較。

資料來源：

- 已有的站點 15 分鐘觀測窗
- 重算後的電量不可借率資料

建議方法：

- 對主要比例加入 95% 信賴區間：
  - 清大 vs 交大缺車率
  - 星期一 vs 星期五缺車率
  - Top 10 站點缺車率
  - 電量門檻候選分組不可借率
- 多時段比較可先使用描述式 ANOVA table 或效果大小，不一定要過度強調 p-value。
- 若做多重比較，需註明使用 Bonferroni 或 Holm 修正。

預期輸出：

- `comparisonIntervals`
- `weekdayComparisons`
- `batteryThresholdComparisons`

報告用途：

- 方法段落可從「描述統計」提升到「決策與推論」。

## 執行順序

1. 先做第 3 項站點集中度，成本最低，能立即改善 Q1。
2. 再做第 1 項電量不可借率，修正 Q4 與結論。
3. 再做第 2 項恢復分類，修正 Q5。
4. 最後做第 4 項信賴區間與多組比較，補強統計課程連結。

## 成本估計

- 站點集中度：數秒到數分鐘。
- 電量不可借率：需要 chunk-based join，約 20-60 分鐘。
- 恢復分類：若只查候選窗口，約 20-60 分鐘。
- 信賴區間與多組比較：資料備好後約 10-30 分鐘。
