# 数据填写指南

以下字段约定来自上游模板，并补充本版本实际使用方式。

### 首次写入字段速查

保留空白底板已有的容器键；模块关闭时保留空数组或 `null`，不要删除容器。首次生成至少遵守：

- `metadata` 写 `tripId`、`title`；`trip` 写 `status: "draft"`、起止日期、`dayCount`、国家和目的地区域。日期使用 `YYYY-MM-DD`。
- `days[]` 写 `day`、`date`、`title`、`locations[]`、`schedule[]`；行程项写 `id`、`time`、`type`、`text`，有对应数据时再加 `placeId` / `placeIds` / `ticketIds`。`dayCount` 必须等于 Day 数量。
- `accommodations[]` 可保留住宿记录；当前页面要显示的入住、退房和住宿文字仍写入对应的 `day.schedule[]`。
- 完整航班使用 `flightJourneys[]:{id}` 和 `flights[]:{id,journeyId,sequence,airline:{name或nameZh},flightNumber,departure:{airportCode,city,date,time,utcOffset},arrival:{同结构}}`。资料缺失时只写带 `placeholder:true`、`status:"pending"`、`missingFields[]` 的 Journey，不猜航班事实。
- `places[]` 写唯一 `id` 和 `name` 或 `nameZh`；`ticketPlanning.items[]` 用唯一 `id`、`day` / `dayId`、名称和 `requirement`，由行程项的 `ticketIds[]` 关联。
- `preTrip.packingItems[]` 写 `id`、`text`、`completed`；没有用户明确提供的 To Do 时保持空数组。
- 开启租车时，`rentalCar` 写 `company`、`rentalPeriodDays`、`vehicle:{example,class}`、`unlimitedKilometers`、`price:{currency,payAtCounter}`、`insurance[]`、`pickup:{date,time,location,address,utcOffset}`、`dropoff:{date,time,timeZoneLabel,vehicleReturnPoint,deadlineWarning,recommendedArrivalTime,utcOffset}`；同时保留租车检查、驾驶提醒和参考链接数组。
- 地图开启时填写 `region`、`places[]`、`routes[]`、`dailyRoutes[]`。地图地点使用唯一 ID，优先提供经纬度；路线的 `day` 对应已有 Day，`placeIds` 至少两个且必须存在。多目的地地点还需 `countryCode` 或 `mapRegionId`；Daily Map 需要交通图标时，用 `scheduleItems` 按相邻路线段关联行程项 ID 或索引。
- 地图关闭时三组地图数组可为空；地图开启时运行 Builder。Agent 不写 `routeMap` 或 `metadata.assets.routeMaps`。

Hero 标题与地图模式完全独立。固定规则只有两种：

- 国内旅行：`trip.primaryDestinationName` 保留用户资料中的主要目的地表述，例如“内蒙古”“成都”“新疆”；Hero 不显示“中国”；
- 国外旅行：Hero 根据 `primaryDestinationCountries` 显示国家名；多国之间使用 ` × `。

优先从旅行计划标题、路线主题或用户原文提取 `primaryDestinationName`，不要机械取第一个城市，也不要根据地图 Scope 改写它。资料没有明确目的地表述时，才回退到 `primaryDestinationCity` 或 `citiesAndAreas` 第一项。`trip.heroTitle` 仅作为用户后续明确 DIY 时的直接展示覆盖值。


## 本版补充

租车对象在 `groundTransport.rentalCar`，不是顶层。住宿记录也要写入每天 schedule 才会显示。

门票使用 `ticketPlanning.items[]` 的 `officialUrl` 和 `document:{url,type,label}`。官方网页文档的 type 为 text/html；PDF 为 application/pdf，使用相对路径 assets/tickets/...。行程 schedule[].ticketIds 关联门票 ID。没有真实票据时不要伪造 PDF 或已购状态。

地图 dailyRoutes[].scheduleItems 可包含按相邻路线段分组的嵌套数组；保留结构，现有实现可展开识别。用 build-map 构建 region 及 routeMap。

initialLedger 为可选的首次记账种子，结构参考 examples/switzerland-italy-13days.json；只在本地尚无记录时注入，不覆盖用户已保存账单。新旅行没有账单资料时设为 null。两人示例的分账是等额分摊，并非所有新旅行固定两人或平分。
