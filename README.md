# 阿我的 oloo 勒？

<img src=oloo.webp width=500>

> 每週五 oloo 定期聚。

每週上課下課都借不到車，明明看到前面停了十台卻一台都不能借。因此我們希望透過分析 oloo 的 API 來進行流量追蹤分析每台車都去哪了，車子無法借閱的原因，以及到底幾點出發才借得到車。

## 爬蟲資料庫

這個專案會用 Node.js + TypeScript 定期抓 oloo API，將會變動的 endpoint 每分鐘寫入 PostgreSQL + TimescaleDB；較不會變動的站點、方案、電子圍籬等資料在啟動時抓一次並 upsert。

### 專案結構

這個 repo 是 pnpm monorepo：

- `apps/crawler`：oloo API 爬蟲、PostgreSQL / TimescaleDB schema、即時 dashboard、資料匯出 scripts。
- `apps/report`：期末報告前端，使用 Vite + ECharts，版面以 A4 與 `mm` 為主。

root scripts 會轉呼叫對應 workspace package，因此日常操作仍可在 repo root 執行。

### 啟動

先建立 `.env`：

```sh
cp .env.example .env
```

填入 `ACCESS_TOKEN` 後啟動：

```sh
docker compose up --build
```

啟動後可以開啟 `http://localhost:3456` 查看即時統計 dashboard。可用 `.env` 的 `DASHBOARD_PORT` 修改對外 port。

### 資料表

主要資料表：

- `raw_endpoint_observations`：所有會變動 endpoint 的原始 JSON 時序快照。
- `static_endpoint_items`：靜態 endpoint 的最新原始 JSON。
- `scooter_info_observations`：每分鐘車輛所屬站點、是否 active、是否被帳號借用等資訊。
- `scooter_status_observations`：每分鐘車輛狀態、經緯度、電量、速度、鎖定狀態。
- `station_scooter_counts`：每分鐘每站車輛數、可用車數、被借走車數。
- `vehicle_info_observations`：每分鐘車輛 id、車牌、車型、通訊模組、可行駛距離與租借狀態。
- `vehicle_status_observations`：每分鐘車輛 GPS、速度、里程、電源、OBD、BMS 等狀態。
- `station_vehicle_counts`：每分鐘每站車輛數、可用車數、被借走車數。

常用 view：

- `current_scooter_locations`：每台車最新車輛資訊 + 最新位置。
- `current_station_scooter_counts`：每個站點最新車輛數。
- `current_vehicle_locations`：每台車最新車輛資訊 + 最新位置與車況。
- `current_station_vehicle_counts`：每個站點最新車輛數。

### Dashboard

內建 dashboard 會每 30 秒刷新，顯示：

- 滑板車與車輛的總數、active、可用、租用中、有位置資料數。
- 每站滑板車/車輛總數、可用數、租用中數。
- 每個 endpoint 最新爬蟲狀態。
- 近 1 小時 raw snapshot 數與靜態 endpoint item 數。

### 期末報告前端

期末報告頁已整理成 Vite + ECharts 前端，來源碼集中在 `apps/report/src/`：

```sh
pnpm report:dev
```

開啟 `http://127.0.0.1:5173/report/` 查看報告。報告版面以一頁一張 A4 和 `mm` 為主要排版單位，圖表使用 ECharts SVG renderer，右上角有列印按鈕可叫出瀏覽器列印流程並匯出 PDF。

產生靜態報告：

```sh
pnpm build:report
```

輸出會放在 `apps/report/dist/`。

### 匯出與視覺化分析

先完整備份目前 Postgres/TimescaleDB：

```sh
pnpm dump:local
```

預設會輸出到 `apps/crawler/exports/dumps/oloo-*.dump`。如果不在 compose 專案目錄執行，也可以指定既有容器名稱：

```sh
DB_CONTAINER=where-is-oloo-db-1 pnpm dump:local
```

產生適合前端視覺化的站點時間序列 CSV：

```sh
pnpm export:analysis
```

預設會用 `5 minutes` 聚合 `station_scooter_counts` 與 `station_vehicle_counts`，輸出：

- `apps/crawler/exports/analysis/station_counts_5min.csv`
- `apps/crawler/exports/analysis/summary.json`

可用環境變數調整時間粒度或範圍：

```sh
ANALYSIS_BUCKET="1 minute" ANALYSIS_START="2026-05-01" ANALYSIS_END="2026-05-28" pnpm export:analysis
```

啟動分析頁：

```sh
pnpm analysis:serve
```

開啟 `http://127.0.0.1:3457`，可以篩選交大/清大、滑板車/車輛，並縮放時間範圍查看各站可用車數折線圖。

若要專門看每個週一與週五交大/清大各站和總體的「總車數 / 可借車數」變化，開啟：

```text
http://127.0.0.1:3457/weekday-analysis.html
```

### 查詢範例

查看目前每站可用車數：

```sql
SELECT
  c.observed_at,
  s.payload->>'name' AS station_name,
  c.station_id,
  c.scooter_count,
  c.available_scooter_count,
  c.rented_scooter_count
FROM current_station_scooter_counts c
LEFT JOIN static_endpoint_items s
  ON s.endpoint_name = 'scooter-rental-stations-active-stations'
  AND s.source_id = c.station_id::text
ORDER BY c.available_scooter_count DESC;
```

查看目前疑似借用中的車與位置：

```sql
SELECT
  engine_license_number,
  imei,
  scooter_rental_station_id,
  latitude,
  longitude,
  power,
  speed,
  status_observed_at
FROM current_scooter_locations
WHERE is_rented = true
ORDER BY status_observed_at DESC;
```
