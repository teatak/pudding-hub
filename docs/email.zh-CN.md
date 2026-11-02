# Email 插件与邮件看板

需要支持协议 59 / Plugin API 1.3（包含新增预设） 的 Core 和对应 Desktop。安装 `Email` 插件和“邮件看板”（Email Board），在插件连接中选择 iCloud、Gmail 或 IMAP / SMTP，再在看板顶部选择连接。

| 方式 | 收信 | 发信 | 凭据 |
| --- | --- | --- | --- |
| iCloud | imap.mail.me.com:993，TLS | smtp.mail.me.com:587，STARTTLS | 完整邮箱地址、Apple 应用专用密码 |
| Gmail | imap.gmail.com:993，TLS | smtp.gmail.com:465，TLS | 完整邮箱地址、Google 应用专用密码 |
| QQ 邮箱 | imap.qq.com:993，TLS | smtp.qq.com:465，TLS | 完整邮箱地址、客户端授权码 |
| 163 邮箱 | imap.163.com:993，TLS | smtp.163.com:465，TLS | 完整邮箱地址、客户端授权码 |
| 126 邮箱 | imap.126.com:993，TLS | smtp.126.com:465，TLS | 完整邮箱地址、客户端授权码 |
| Yahoo Mail | imap.mail.yahoo.com:993，TLS | smtp.mail.yahoo.com:465，TLS | 完整邮箱地址、应用专用密码 |
| Fastmail | imap.fastmail.com:993，TLS | smtp.fastmail.com:465，TLS | 主账号邮箱地址、应用专用密码 |
| 自定义 | 手动填写主机、端口、TLS/STARTTLS | 手动填写主机、端口、TLS/STARTTLS | 邮箱密码或服务商授权码 |

配置指引：[Apple iCloud Mail](https://support.apple.com/102525)、[Google 应用专用密码](https://support.google.com/mail/answer/185833)。Google 应用专用密码需要两步验证，部分受管理或受保护账号不能使用。只支持 OAuth 的服务商不在本版支持范围内。自定义服务器需提供受系统信任的 TLS 证书，不支持明文或忽略证书错误。SMTP 支持 PLAIN 和 LOGIN 认证。

所有预设只需填写邮箱地址和应用专用密码或授权码，其余参数自动配置，连接名称自动生成并可在编辑时修改。自定义 IMAP/SMTP 方式提供完整服务器参数；可选 IMAP/SMTP 登录名留空时使用邮箱地址；单独的 SMTP 密码未设置时使用主密码。已有密钥的空输入表示保留，清除单独 SMTP 密码需要明确操作。密码使用统一加密凭据存储，设置接口只返回“已设置”，不回传密钥。

保存连接会验证收、发信登录，不会发邮件。更换密码且仍是同一邮箱时，保留绑定、备注和草稿。更换邮箱或 IMAP 主机/登录名时新建连接，再重新选择；慢请求不能覆盖后续配置，旧配置的读取结果会失效。

看板按需读取收件箱，每张卡片对应一封邮件；搜索为普通文本，不使用 Gmail 搜索语法。每页最多搜索 5000 个 UID 位置，空页仍可能有“下一页”。纯文本和 HTML 正文各最多读取 64 KiB。有 HTML 的邮件默认显示经过清理的富文本，可切换纯文本；只有 HTML 的邮件也提供纯文本回退。保留排版、表格及 HTTP(S)/mailto 链接，移除脚本、表单、外部资源和全局样式，不加载远程图片。附件只显示名称等元数据，不支持下载。读取不会标记已读。富文本需要宿主协议 60 或以上。

分类、备注、回复草稿以及必要的卡片摘要保存在 Pudding 本地；不全量下载邮箱，不保存邮件正文或附件，也不修改服务器标签、已读状态或草稿。插件可通过模型工具发送纯文本新邮件或回复，必须有用户发信请求；看板保存草稿不等于发送。SMTP 返回结果不确定时禁止自动重试，避免重复投递。已发送副本由服务器处理；部分自定义/iCloud 服务器可能不会自动保留，本版不额外追加副本。

原 Gmail Board 已下架，其历史发布包和本地资料保持不变。新版安装名为“邮件看板”，使用独立 `emailBoard` 数据区和稳定 mailboxID。Gmail API 消息 ID 与 IMAP UID 不可直接互换，旧看板卡片不自动迁移；仍可在旧看板中查看已有本地内容。旧 OAuth 连接也不会自动转换成应用专用密码连接。

QQ、163、126 需先在邮箱设置中开启 IMAP/SMTP 并生成客户端授权码：[QQ 官方指引](https://help.mail.qq.com/detail/106/985)、[网易官方指引](https://help.mail.126.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac25c12dcb3d46222b6)。[Yahoo](https://help.yahoo.com/kb/SLN4075.html) 和 [Fastmail](https://www.fastmail.help/hc/en-us/articles/1500000278342-Server-names-and-ports) 使用应用专用密码；Fastmail Basic 套餐不支持第三方客户端。[Outlook.com 要求 OAuth2](https://support.microsoft.com/en-us/outlook/pop-imap-and-smtp-settings-for-outlook-com)，本版暂不提供密码连接预设。
