# 阿我的 oloo 勒？

每週上課下課都借不到車，明明看到前面停了十台卻一台都不能借。因此我們希望透過分析 oloo 的 API 來進行流量追蹤分析每台車都去哪了，車子無法借閱的原因，以及到底幾點出發才借得到車。

![73 台 oloo 齊聚一堂](oloo.jpeg)

> 每週五 oloo 定期聚。

## 爬蟲資料庫

這個專案會用 Node.js + TypeScript 定期抓 oloo API，將會變動的 endpoint 每分鐘寫入 PostgreSQL + TimescaleDB；較不會變動的站點、方案、電子圍籬等資料在啟動時抓一次並 upsert。

### 啟動

先建立 `.env`：

```sh
cp .env.example .env
```

填入 `ACCESS_TOKEN` 後啟動：

```sh
docker compose up --build
```

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
