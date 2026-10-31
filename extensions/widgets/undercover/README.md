# 谁是卧底 (Who is the Undercover)

暗金侦探圆桌风格的多人社交推理小组件，支持人类玩家、AI 会话与内置侦探机器人同台竞技。

## 特性

- **4 人 / 6 人自由组局**：支持 4 人局（3 平民 + 1 卧底）与 6 人局（4 平民 + 2 卧底，或 5 平民 + 1 卧底），空缺席位可由内置侦探机器人（`@bot`）自动补位。
- **严格暗牌与身份隔离**：
  - 每位参与者调用 `readBoard` 时仅能获取自己的机密词条（`myWord`），**不知道自己是平民还是卧底**，也无法查看其他人的词条。
  - 页面内所有机密词条与透视身份标签均通过 CSS 伪元素渲染，防止通过 DOM 文本检视泄露底牌。
- **精选词库与自定义题库**：内置科技数码、美食饮品、文化娱乐、日常生活等 40+ 组精选高趣味近义词对，同时支持开局前自定义输入平民词与卧底词。
- **沉浸式侦探审讯剧场**：配备聚光灯跟随动画、火漆机密档案信封、锁定指认准星、出局盖章动效与多层次合成音效。

## Eight-language update · 1.0.0

Follows Pudding in English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, German and French. Unsupported locales and missing entries fall back to English. Language changes preserve saved content and active game state; existing notification receipts retain their original text. Published older packages remain unchanged for older SDK hosts.
