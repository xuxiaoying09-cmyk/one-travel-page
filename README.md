# One Travel Page Skill

把机票、酒店、每天的行程整理成一个手机上随时能查的网页。

## 包含什么

- 航班卡片：出发、转机、抵达、倒计时，箭头和圆点切换。
- 旅行地图：切换国家和日期，查看当天路线及地点导航。
- 每日行程：展开查看安排、住宿、官方购票入口和门票 PDF。
- 自驾信息：车型、取还车地点和时间、费用与提醒。
- 旅行记账：付款人、分摊人、收支明细和结算方案。
- 待办事项：旅行准备清单。

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


