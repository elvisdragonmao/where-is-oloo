# API 整理

這裡是我手動監聽整理的 API Endpoints。只保留對於統計分析有用的。

下載資料時請在 URL query 補上 `access_token`，例如沒有 query 的 endpoint 使用 `?access_token=<token>`，已經有 query 的 endpoint 使用 `&access_token=<token>`。

完整下載摘要：[`example_data/_endpoint-download-summary.json`](./example_data/_endpoint-download-summary.json)

| 分類 | Endpoint | Output | 資料量 | 主要資料 |
| --- | --- | --- | --: | --- |
| 個人借閱紀錄 | `https://looplus-api-staging.loopluscooter.com/nest/api/rental-logs/get-rental-logs-by-account` | [`example_data/get-rental-logs-by-account.json`](./example_data/get-rental-logs-by-account.json) | 52 | 借閱 id、費用、開始/結束時間、里程、車牌、站點/方案資訊 |
| 借閱方案比較 | `https://looplus-api-staging.loopluscooter.com/nest/api/contracts` | [`example_data/contracts.json`](./example_data/contracts.json) | 57 | 合約 id、名稱、類型、付款類型、折扣、series、details |
| 優惠券相關 | `https://looplus-api-staging.loopluscooter.com/nest/api/coupons` | [`example_data/coupons.json`](./example_data/coupons.json) | 75 | 優惠券 id、名稱、說明、屬性、可用條件、details |
| oloo 文案 | `https://looplus-api-staging.loopluscooter.com/nest/api/oloo-options` | [`example_data/oloo-options.json`](./example_data/oloo-options.json) | 20 | option id、名稱、value、建立/更新時間 |
| 車輛資訊 | `https://looplus-api-staging.loopluscooter.com/nest/api/vehicles-infos` | [`example_data/vehicles-infos.json`](./example_data/vehicles-infos.json) | 36 | 車輛 id、車牌、車型、ModemID、IMEI、門號 |
| 車輛狀態 | `https://looplus-api-staging.loopluscooter.com/nest/api/vehicle-statuses` | [`example_data/vehicle-statuses.json`](./example_data/vehicle-statuses.json) | 47 | 狀態 id、MsgType、ModemID、交易/訊息 id、GPS 時間 |
| 滑板車資訊 | `https://looplus-api-staging.loopluscooter.com/nest/api/scooters-infos` | [`example_data/scooters-infos.json`](./example_data/scooters-infos.json) | 1027 | 車輛 id、車牌、IMEI、車型、ICCID、BLE MAC |
| 車輛可用方案 | `https://looplus-api-staging.loopluscooter.com/nest/api/scooters-infos/get-possible-ride-plan/69` | [`example_data/scooters-infos-get-possible-ride-plan-69.json`](./example_data/scooters-infos-get-possible-ride-plan-69.json) | object | possibleRidePlan、basicOrStationRidePlan、basicRidePlan、scooterModelRidePlan |
| 滑板車狀態 | `https://looplus-api-staging.loopluscooter.com/nest/api/scooter-statuses` | [`example_data/scooter-statuses.json`](./example_data/scooter-statuses.json) | 1258 | 狀態 id、IMEI、訊息類型、經緯度、電量 |
| 可用租借站 | `https://looplus-api-staging.loopluscooter.com/nest/api/scooter-rental-stations/active-stations` | [`example_data/scooter-rental-stations-active-stations.json`](./example_data/scooter-rental-stations-active-stations.json) | 80 | 站點 id、名稱、站號、地址、經緯度 |
| 騎乘方案 | `https://looplus-api-staging.loopluscooter.com/nest/api/ride-plans` | [`example_data/ride-plans.json`](./example_data/ride-plans.json) | 69 | 方案 id、名稱、類型、最低分鐘/價格、折扣時間、費率 |
| 最後一筆借閱紀錄 | `https://looplus-api-staging.loopluscooter.com/nest/api/rental-logs/get-last-rental-log-by-account` | [`example_data/rental-logs-get-last-rental-log-by-account.json`](./example_data/rental-logs-get-last-rental-log-by-account.json) | 1 | 最近一次借閱 id、費用、時間、里程、車牌 |
| 多 feature 電子圍籬 | `https://looplus-api-staging.loopluscooter.com/nest/api/location-meta/multi-feature-efences` | [`example_data/location-meta-multi-feature-efences.json`](./example_data/location-meta-multi-feature-efences.json) | 19 | efence id、type、properties |
| 電子圍籬顯示範圍快取 | `https://looplus-api-staging.loopluscooter.com/nest/api/location-meta/cache/efence-display-ranges` | [`example_data/location-meta-cache-efence-display-ranges.json`](./example_data/location-meta-cache-efence-display-ranges.json) | 11 | id、locationId、metaKey、metaValue、建立/更新時間 |

## 目前下載結果

所有 endpoint 都成功回傳 HTTP 200，資料已下載到 `example_data/`。

`scooters-infos/get-possible-ride-plan/69` 回傳 object，其餘 endpoint 回傳 array。
