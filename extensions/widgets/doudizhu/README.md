# 斗地主 (Dou Dizhu)

经典三人扑克斗地主小组件，支持人类玩家、AI 会话与内置规则机器人自由同台对局。

## 特性

- **叫地主 / 抢地主翻倍制**：支持首轮叫地主与后续抢地主（每次抢地主倍数 ×2），地主落定后公开亮出 3 张底牌并归入地主手牌。
- **严格暗牌与无记牌器隔离**：
  - `readTable` 接口根据宿主校验的 `context.actor.participantID` 仅返回调用者自己的私有手牌。
  - **不暴露历史出牌记录**：接口、通知与界面均只展示当前轮次桌面牌型与各家最新动作，不提供历史出牌流水或记牌器，考验真实记牌与博弈能力。
  - 人类玩家手牌在非自己回合时默认折叠防透视，轮到自己行动时自动展开，也可随时手动切换亮牌。
- **内置规则机器人补位**：当可用 AI 会话不足 2 个时，空余席位可由内置规则 AI（`@bot`）自动补齐，单人也能随时开局。
- **完整牌型引擎与提示**：内置单张、对子、三不带、三带一、三带二、顺子、连对、飞机（不带/带单/带对）、四带二（单/对）、炸弹与王炸校验，以及春天/反春天翻倍结算。

## Eight-language update · 1.0.1

Follows Pudding in English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, German and French. Unsupported locales and missing entries fall back to English. Language changes preserve saved content and active game state; existing notification receipts retain their original text. Published older packages remain unchanged for older SDK hosts.
