<p align="center">
  <img src="assets/brand/icon.png" width="128" alt="One Travel Page 旅行图标">
</p>

<h1 align="center">One Travel Page</h1>
<p align="center"><strong>把整趟旅行，装进一个网页 🧳</strong></p>
<p align="center">攻略带上，快乐出发。</p>

机票在订单里，酒店在聊天里，行程在备忘录里？
把这些资料交给 AI，整理成一张随身旅行小抄。下一站去哪、今晚住哪、门票在哪，点开就能查。

### 你的旅行小帮手，全部就位 ✨

| 随身带上 | 路上能做什么 |
| --- | --- |
| ✈️ 航班小卡片 | 几点起飞、哪里转机、还要等多久，一眼就有数。 |
| 🗺️ 会切换的路线图 | 选个国家、点个日期，看看今天往哪儿走。 |
| 📅 每日行程口袋 | 展开当天安排，住宿、景点、购票入口和门票 PDF 都放好。 |
| 🚗 自驾备忘录 | 车型、取还车时间和地点，出发前看一眼更从容。 |
| 🧾 同行记账本 | 谁买单、谁分摊、最后谁转给谁，算得清清楚楚。 |
| ✅ 出发前的小清单 | 把待办一项项勾掉，轻轻松松去旅行。 |

> 从一趟周末出游，到一次跨国长假，让攻略跟着你走。🌏

## 在 Codex 中使用

把本仓库地址发给 Codex，并说：

> 安装这个仓库里的 one-travel-page Skill，根据我提供的机票、酒店和行程生成旅行网页。

也可以将整个仓库下载到 `~/.codex/skills/one-travel-page`，再在新对话中使用：

> 使用 $one-travel-page，帮我生成一个旅行网页。

附上旅行资料即可；没有的信息会留待补充。需要演示时可以说：

> 使用 $one-travel-page，先生成瑞士＋意大利 13 天版本。

## 本地运行

需要 Python 3 和 Node.js 20 或以上。无需 npm install。

```bash
python3 scripts/create_trip.py ../my-travel --demo
cd ../my-travel
npm run build:map
npm run validate
npm run preview
```

用终端输出的地址打开网页。省略 `--demo` 会创建空白模板供 AI 填写。

## 数据与分享

内置 13 天资料为功能演示数据，不代表真实预订、实时航班或报价。酒店只包含城市、住宿安排和演示费用。新旅行默认使用空白资料，账本使用独立旅行 ID。

生成的网站可以部署到静态托管服务，再把网址发给同行人。默认记账和待办保存在当前浏览器，多手机同步需要额外配置共享存储；本仓库不包含已配置的云数据库。不要把真实订单、护照、预订凭据或私人账单放进公共仓库。

## 来源与许可

上游项目：**do-tongxue/Travel-Plan-Page**。本版整理者：**xuxiaoying09-cmyk**。

保留上游代码和模板的 MIT 许可，具体见 [LICENSE](LICENSE)。本版主要加入最终页面的交互修正、官方门票入口、记账种子能力，以及可复用的 Skill 和独立项目生成脚本。第三方资产说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。


