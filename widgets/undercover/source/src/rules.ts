import type {
  Seat,
  PlayerRole,
  UndercoverLobby,
  UndercoverPosition,
  WordCategory,
  WordPair,
} from "./types";

export const allSeats: Seat[] = [
  "Seat1",
  "Seat2",
  "Seat3",
  "Seat4",
  "Seat5",
  "Seat6",
];

export function seatsForCount(count: 4 | 6): Seat[] {
  return count === 4 ? allSeats.slice(0, 4) : allSeats.slice(0, 6);
}

export function isBotParticipant(id: string | null | undefined): boolean {
  return !id || id.startsWith("@bot");
}

export const WORD_PAIRS: WordPair[] = [
  // Tech & Digital (科技数码)
  {
    id: "tech-1",
    category: "tech",
    civilianWord: "ChatGPT",
    undercoverWord: "DeepSeek",
    civilianClues: [
      "经常陪我写代码改文案的对话式大模型助手",
      "最早掀起全球生成式 AI 浪潮的代表性产品",
      "背靠硅谷知名实验室，图标像一朵旋转的花",
      "支持语音和视觉多模态，订阅会员叫 Plus",
      "大家聊起人工智能聊天机器人第一个想到的名字",
      "迭代了很多代模型系列，有旗舰版也有轻量推理版",
    ],
    undercoverClues: [
      "能力很强的对话式大模型助手，写代码推理都很溜",
      "因为极致性价比和开源推理模型轰动全球的 AI",
      "图标是一只蓝色的鲸鱼，中文圈几乎无人不知",
      "思考过程会直接展示出来，经常带着深度思考标签",
      "来自国内顶尖团队，把大模型训练成本打下来的破局者",
      "回应问题逻辑严密，推理模式名字里带个 R",
    ],
  },
  {
    id: "tech-2",
    category: "tech",
    civilianWord: "蓝牙耳机",
    undercoverWord: "助听器",
    civilianClues: [
      "平时戴在耳朵上的小巧电子设备，不需要插线",
      "通勤坐地铁或者运动跑步时几乎人手一副",
      "一般配有一个充电盒，支持主动降噪功能",
      "主要用来听音乐、打电话或者看视频",
      "弄丢其中一只的时候会让人非常心疼",
      "和手机无线配对连接，续航一般在几小时左右",
    ],
    undercoverClues: [
      "戴在耳朵上的精密微型电子装置，体积很小",
      "能把外界的声音处理放大后清晰地传进耳朵",
      "主要帮助听力受损或年长的人听清日常交谈",
      "需要根据每个人的情况进行专业调试验配",
      "贴合耳道或者挂在耳后，讲究佩戴舒适隐蔽",
      "属于医疗辅助级穿戴设备，能显著改善沟通体验",
    ],
  },
  {
    id: "tech-3",
    category: "tech",
    civilianWord: "机械键盘",
    undercoverWord: "打字机",
    civilianClues: [
      "用手指敲击输入文字的设备，段落感特别明显",
      "敲起来噼里啪啦响，不同轴体手感声音完全不同",
      "程序员和游戏玩家的最爱，键帽可以自己更换定制",
      "很多款式带有炫酷的 RGB 背光灯效",
      "放在电脑桌面上使用，有红轴、青轴、茶轴之分",
      "相比普通薄膜款式更厚重，按键寿命很长",
    ],
    undercoverClues: [
      "敲击按键来输出文字的经典机械装置，声音清脆",
      "每按下一个键都会带动金属字锤敲在色带和纸上",
      "不需要连电脑屏幕，敲出来的字直接印在纸张上",
      "每打完一行需要手动推一下滚筒换行，还会叮的一声",
      "充满复古文艺气息，老电影里作家和记者常用",
      "一不小心打错一个字很难直接按退格键擦掉",
    ],
  },
  {
    id: "tech-4",
    category: "tech",
    civilianWord: "无人机",
    undercoverWord: "风筝",
    civilianClues: [
      "能在天空中飞行的物件，地面上有人专门操控它",
      "靠多组高速旋转的螺旋桨提供升力，还能悬停",
      "常用来航拍风景、巡检或者表演夜间灯光秀",
      "内置电池和摄像头，没电或者没信号会自动返航",
      "飞行时会有嗡嗡的螺旋桨声音，受禁飞区限制",
      "通过遥控器摇杆和手机图传画面来精准控制方向",
    ],
    undercoverClues: [
      "飞在半空中的东西，需要地面上的人时刻牵引控制",
      "需要借助外面的自然风力才能顺利升空",
      "有一根长长的线连在手里的线轮上",
      "春天公园草坪上特别常见，有燕子、老鹰等各种造型",
      "不需要充电也不用电池，纯粹靠竹骨和纸布做成",
      "一旦绳子断了就会随风飘走找不回来",
    ],
  },
  {
    id: "tech-5",
    category: "tech",
    civilianWord: "充电宝",
    undercoverWord: "稳压器",
    civilianClues: [
      "跟电有关的随身实用设备，方方正正像块砖头",
      "出门旅游或者逛街手机快没电时的救命神器",
      "商场餐厅里经常能看到一排排可以扫码租借的柜机",
      "上面有电量指示灯和几个不同规格的输出接口",
      "上飞机的时候对容量有严格规定，不能托运",
      "平时得先在家里把它充满，出门才能给别的设备续命",
    ],
    undercoverClues: [
      "跟供电安全有关的电子设备，有一定分量",
      "用来保证输出电压保持恒定，防止电器被烧坏",
      "在电网波动大或者精密仪器工作的场所特别重要",
      "通常接在插座和贵重电器之间起到保护作用",
      "上面一般带有电压表盘或者跳动数字显示屏",
      "不能随便揣兜里移动供电，必须接通市电才能工作",
    ],
  },
  {
    id: "tech-6",
    category: "tech",
    civilianWord: "指纹锁",
    undercoverWord: "密码箱",
    civilianClues: [
      "用来守护安全、防止别人随便打开的锁具装置",
      "装在家里入户大门上，出门再也不用带钥匙",
      "手指轻轻一按就能识别身份自动打开",
      "除了生物识别，通常还支持输入数字或刷卡开锁",
      "需要装电池供电，快没电的时候会发声提醒",
      "智能家居最受欢迎的入门单品之一",
    ],
    undercoverClues: [
      "用来保管重要物品、带锁定机构的容器装置",
      "靠拨动几组数字转盘对准正确组合才能打开",
      "出差旅行或者谍战片里装机密文件经常用到",
      "带有提手或万向轮，外壳坚固抗摔",
      "不需要通电也不用电池，纯机械结构也很可靠",
      "如果忘了设定的那串数字就只能找锁匠或者硬撬",
    ],
  },

  // Food & Drink (美食饮品)
  {
    id: "food-1",
    category: "food",
    civilianWord: "麻辣烫",
    undercoverWord: "冒菜",
    civilianClues: [
      "热气腾腾的川味街头美食，各种食材煮在一起",
      "拿着夹子和盆在冷柜前自己挑喜欢的丸子蔬菜称重",
      "一碗里面有荤有素有主食，汤底可以选骨汤或红油",
      "杨国福和张亮是街头最常见的两大招牌",
      "适合一个人快速解决午餐，还能加满满一勺麻酱",
      "食材按重量计费，想吃多少夹多少非常自由",
    ],
    undercoverClues: [
      "香辣过瘾的川渝特色美食，十几种食材荟萃一碗",
      "常被称为一个人的火锅，红油香气特别浓郁",
      "在竹篓或漏勺里把菜烫熟后盛进调好底料的大碗里",
      "一般搭配一碗白米饭吃，超级下饭",
      "点单时常有配好的荤素套餐，上面撒满蒜泥和香菜",
      "汤底偏重油麻辣，一般只吃菜不直接喝底汤",
    ],
  },
  {
    id: "food-2",
    category: "food",
    civilianWord: "拿铁",
    undercoverWord: "卡布奇诺",
    civilianClues: [
      "咖啡馆菜单上点单率极高的意式奶咖",
      "浓缩咖啡加入大量温热的牛奶，口感丝滑温和",
      "苦味比较淡，奶香浓郁，上面常有漂亮的拉花图案",
      "冰饮和热饮都很受欢迎，早上打工人的续命标配",
      "在意大利语里它本来的意思其实就是牛奶",
      "牛奶比例明显高于奶泡，喝起来一口顺到底",
    ],
    undercoverClues: [
      "咖啡店里非常经典的意式风味牛奶咖啡",
      "由浓缩咖啡、蒸汽牛奶和厚厚一层绵密奶泡组成",
      "顶部奶泡特别丰盈蓬松，有时还会撒一点可可粉或肉桂粉",
      "咖啡味比普通奶咖更醇厚一点，泡沫感十足",
      "喝的时候嘴唇上很容易沾上一圈白胡子",
      "一般做成热饮最能体现它三分之一黄金配比的口感",
    ],
  },
  {
    id: "food-3",
    category: "food",
    civilianWord: "小笼包",
    undercoverWord: "生煎包",
    civilianClues: [
      "江南一带极具代表性的传统带馅面点，个头小巧",
      "皮薄馅大，里面包着鲜美滚烫的肉皮冻汤汁",
      "放在竹制笼屉里用蒸汽蒸熟，端上来热气腾腾",
      "吃的时候讲究先咬开一个小口吸汤，再蘸姜丝香醋",
      "顶上有精致的十几道褶子，半透明能隐约看到汤汁",
      "心急一口吞下去的话非常容易烫到舌头",
    ],
    undercoverClues: [
      "上海和江南非常出名的传统特色带汤肉馅面点",
      "上半部分松软，底部被煎得金黄焦脆",
      "在平底大铁锅里淋油和水煎熟，出锅前撒满黑芝麻和葱花",
      "咬开里面也有浓郁滚烫的肉汤，底部嘎嘣脆",
      "完美结合了软嫩面皮、鲜美汤汁与焦香锅巴三种口感",
      "刚出锅时油香四溢，配一碗咖哩牛肉粉丝汤绝佳",
    ],
  },
  {
    id: "food-4",
    category: "food",
    civilianWord: "可口可乐",
    undercoverWord: "百事可乐",
    civilianClues: [
      "全球知名的深褐色碳酸汽水，加冰块喝超级爽",
      "标志性的正红色包装和飘逸的白色丝带字体",
      "吃炸鸡汉堡火锅时的快乐肥宅水首选",
      "配方高度保密，气泡感比较强劲凌厉",
      "圣诞老人穿红衣服的经典形象就是它推广开的",
      "股神巴菲特每天都要喝好几罐的经典饮料",
    ],
    undercoverClues: [
      "风靡全球的深褐色气泡碳酸饮料，冰镇后口感极佳",
      "经典包装以皇家蓝为主色调，配红白蓝圆形球标",
      "味道清甜爽口，带有淡淡的柑橘系香气",
      "经常邀请顶级流行音乐巨星和足球明星拍酷炫广告",
      "肯德基餐厅里的长期御用搭档汽水",
      "定位年轻潮流，口号经常强调新一代的选择",
    ],
  },
  {
    id: "food-5",
    category: "food",
    civilianWord: "烤肉",
    undercoverWord: "火锅",
    civilianClues: [
      "非常适合朋友聚餐的美食，大家围着桌子边做边吃",
      "五花肉和牛肉片放在铁盘或炭火架上滋滋冒油",
      "油脂滴落时香气扑鼻，一般用生菜叶包着蒜片辣酱吃",
      "吃的时候需要勤快翻面，不然很容易焦黑",
      "分韩式、日式和东北风味，蘸干料或甜辣酱都很绝",
      "吃完出来身上和头发上往往会沾上浓浓的油烟香",
    ],
    undercoverClues: [
      "聚会团建人气最高的餐饮形式，全桌围坐热闹非凡",
      "一口沸腾翻滚的锅居中，各种肉卷毛肚往里涮",
      "讲究七上八下控制秒数，还有鸳鸯锅照顾不同口味",
      "自助调料台是灵魂，香油蒜泥和麻酱各显神通",
      "从肉类、海鲜到蔬菜宽粉都能一锅搞定",
      "冬天吃完全身暖洋洋，衣服上也会留下浓郁的牛油香",
    ],
  },
  {
    id: "food-6",
    category: "food",
    civilianWord: "榴莲",
    undercoverWord: "臭豆腐",
    civilianClues: [
      "气味极其独特、让人两极分化非常严重的食物",
      "喜欢的人觉得香甜软糯，讨厌的人闻到就捂鼻子躲开",
      "外壳长满坚硬扎手的尖刺，被称为水果之王",
      "果肉金黄饱满像冰淇淋一样绵密，热量很高",
      "很多酒店和公共交通工具明确禁止携带它入内",
      "主产于泰国和马来西亚，金枕和猫山王是最火的品种",
    ],
    undercoverClues: [
      "闻起来气味霸道、爱恨两极分化极其明显的小吃",
      "闻着味儿冲，但吃起来外焦里嫩满口留香",
      "夜市小吃街的绝对流量担当，隔着老远就能闻到",
      "经过独特卤水发酵后下油锅炸至酥脆，再灌入蒜汁辣椒汤",
      "长沙的黑色经典款式和绍兴的金黄款式都很有名",
      "用竹签扎着吃，咬破外壳瞬间汤汁在嘴里爆开",
    ],
  },

  // Culture & Entertainment (文化娱乐)
  {
    id: "culture-1",
    category: "culture",
    civilianWord: "福尔摩斯",
    undercoverWord: "柯南",
    civilianClues: [
      "家喻户晓的传奇名侦探，观察力和逻辑推理无人能及",
      "住在伦敦贝克街221B，身边有一位姓华生的医生搭档",
      "标志性装束是猎鹿帽、斗篷风衣和烟斗，还会拉小提琴",
      "只要看一眼鞋底泥土和袖口磨损就能推算出一个人的职业",
      "宿敌是被称为犯罪界拿破仑的莫里亚蒂教授",
      "英国作家笔下的经典人物，被翻拍成无数电影和英剧",
    ],
    undercoverClues: [
      "全世界知名度极高的神探角色，走到哪儿都会遇到案件",
      "外表是个戴眼镜的小学生，真实身份其实是高中生侦探",
      "随身装备有变声领结、麻醉手表和太阳能滑板",
      "每次破案时常借用身边糊涂大叔的声音来揭晓真相",
      "口头禅是真相永远只有一个，主线一直在追查黑衣组织",
      "连载二十多年的超人气推理动漫主角",
    ],
  },
  {
    id: "culture-2",
    category: "culture",
    civilianWord: "狼人杀",
    undercoverWord: "剧本杀",
    civilianClues: [
      "非常适合多人围坐在一起玩的语言推理社交桌游",
      "分好人阵营和隐藏阵营，全靠发言逻辑和微表情博弈",
      "有天黑请闭眼的经典环节，包含预言家、女巫、猎人等角色",
      "大家轮流发言盘逻辑、跳身份、号票把嫌疑人投出局",
      "一局节奏比较快，可以反复开好几局",
      "金水、银水、查杀、焊跳都是这个游戏里的专属黑话",
    ],
    undercoverClues: [
      "年轻人聚会非常火的沉浸式推理社交游戏",
      "每个人都会分到一本厚厚的角色人物小传和专属秘密任务",
      "有专门的主持人控场，需要搜集线索卡、还原故事真相",
      "除了硬核推凶本，还有催泪情感本、欢乐本和恐怖本",
      "一局通常要玩三四个小时，基本只能玩一次不能剧透",
      "有些线下店还提供换装和实景搜证房间体验",
    ],
  },
  {
    id: "culture-3",
    category: "culture",
    civilianWord: "钢铁侠",
    undercoverWord: "蝙蝠侠",
    civilianClues: [
      "漫威和超级英雄电影里人气极高的亿万富翁英雄",
      "本身没有天生超能力，全靠顶尖科技装甲和钞能力战斗",
      "胸口装有发光的能量反应堆，拥有人工智能管家贾维斯",
      "性格幽默高调，在发布会上直接公开承认自己的英雄身份",
      "战甲配色以金红为主，手心能发射脉冲炮飞天作战",
      "复仇者联盟的核心领袖，那句爱你三千遍感动无数影迷",
    ],
    undercoverClues: [
      "美漫电影史上极具魅力的亿万富翁超级英雄",
      "没有任何超能力，依靠顶级格斗技巧、侦探头脑和高科技装备",
      "平时是豪门花花公子，夜晚化身守护哥谭市的暗夜骑士",
      "战衣漆黑带披风和尖耳面具，座驾是一辆酷炫的重装甲战车",
      "身边有忠心耿耿的管家阿福，一生宿敌是疯狂的小丑",
      "行事低调冷峻，从不轻易暴露自己的真实身份",
    ],
  },
  {
    id: "culture-4",
    category: "culture",
    civilianWord: "脱口秀",
    undercoverWord: "相声",
    civilianClues: [
      "靠语言幽默把全场观众逗得捧腹大笑的舞台喜剧表演",
      "通常是一个人拿着一支麦克风站在台上跟观众互动吐槽",
      "素材多来自职场、生活痛点和自我调侃，讲究铺垫和爆梗",
      "线下经常在开放麦小剧场演出，近几年在年轻人中非常火",
      "节奏明快犀利，每个段子结尾往往有出人意料的谐音或反转",
      "起源于欧美单口喜剧，演员自己常既是编剧又是表演者",
    ],
    undercoverClues: [
      "以语言包袱逗乐观众的中国传统曲艺喜剧表演",
      "最常见的是两个人搭档站在桌子后，一个逗哏一个捧哏",
      "讲究说学逗唱四门基本功，台上常穿传统长衫大褂",
      "包袱讲究三翻四抖，还有贯口、柳活等精彩基本功展示",
      "茶馆剧场和春晚舞台上的常客，德云社是著名代表团体",
      "有时也有单口或群口形式，历史悠久底蕴深厚",
    ],
  },
  {
    id: "culture-5",
    category: "culture",
    civilianWord: "魔术师",
    undercoverWord: "魔法师",
    civilianClues: [
      "能够展现出不可思议奇幻画面的神秘角色，常戴礼帽",
      "依靠极快的手速、机关道具和心理错觉来完成的舞台艺术",
      "喜欢用扑克牌、硬币、白鸽和丝巾来表演出人意料的效果",
      "台下观众明明知道是障眼法，却依然看得目瞪口呆",
      "刘谦和大卫·科波菲尔是这一行当里家喻户晓的代表人物",
      "行业铁律是绝不随便向观众公开背后的机关原理",
    ],
    undercoverClues: [
      "能够施展超自然奇幻力量的神秘人物，造型很有辨识度",
      "存在于奇幻小说、电影与游戏世界里，手中常握着魔杖或法杖",
      "通过吟唱咒语或调动元素能量来释放火球、瞬移或变形术",
      "哈利·波特和甘道夫是大家最熟悉的经典形象",
      "有些还戴着尖顶帽、骑着飞天扫帚或在学院里钻研秘术",
      "在游戏团队里通常是远程高爆发输出的核心职业",
    ],
  },
  {
    id: "culture-6",
    category: "culture",
    civilianWord: "交响乐",
    undercoverWord: "歌剧",
    civilianClues: [
      "在音乐厅里演出的高雅艺术形式，场面庄重宏大",
      "几十上百位乐手按弦乐、木管、铜管、打击乐分席位落座",
      "正中央有一位穿燕尾服的指挥家挥舞指挥棒掌控全场节奏",
      "以纯器乐演奏为主，一般分四个乐章，层次极其丰富",
      "贝多芬的《命运》和《欢乐颂》是传世经典之作",
      "观众席保持安静聆听，乐章全部结束时才会报以热烈掌声",
    ],
    undercoverClues: [
      "在大型剧院上演的殿堂级西方经典舞台艺术",
      "将管弦乐队伴奏、戏剧故事冲突与高难度美声演唱融为一体",
      "演员身穿华丽的戏剧服装在舞台布景中边演边唱，不戴麦克风",
      "既有气势恢宏的合唱，也有展现高超唱功的咏叹调独唱",
      "《卡门》《茶花女》和《图兰朵》是享誉世界的代表剧目",
      "乐池通常位于舞台前下方，集视觉与听觉震撼于一身",
    ],
  },

  // Daily Life (日常生活)
  {
    id: "daily-1",
    category: "daily",
    civilianWord: "过山车",
    undercoverWord: "跳楼机",
    civilianClues: [
      "游乐园里尖叫声最大的大型刺激游乐设施",
      "一排排座椅连成列车，沿着高低起伏的蜿蜒轨道高速飞驰",
      "先缓缓爬升到最高点，然后俯冲而下，还有360度大回环翻转",
      "全程风驰电掣，融合了失重感、超重感和急速转弯",
      "下来的时候很多人腿软头晕，表情管理完全失控",
      "有木质轨道、悬挂式和弹射起步等多种刺激玩法",
    ],
    undercoverClues: [
      "游乐场里让人肾上腺素飙升的极限高空游乐项目",
      "大家围坐在高耸入云的垂直塔柱四周，系紧安全肩压杠",
      "把人缓缓升到几十米高空停顿几秒，突然瞬间自由落体急降",
      "核心体验就是垂直方向上极致强烈的瞬间失重感",
      "升到最高点时能俯瞰整个乐园，但没人有心思看风景",
      "还会反复上下弹跳几次才缓缓停回地面",
    ],
  },
  {
    id: "daily-2",
    category: "daily",
    civilianWord: "口红",
    undercoverWord: "润唇膏",
    civilianClues: [
      "涂在嘴唇上的小巧管状随身物品，旋转就能拧出来",
      "化妆包里永远缺下一支的单品，一涂上整个人气色瞬间提升",
      "有正红、豆沙、烂番茄等无数种色号，还有哑光和镜面质地",
      "喝水时有时会在杯子边缘留下明显的印记",
      "送礼物的热门选择，外壳设计往往非常精致高级",
      "吃完火锅或者大餐后通常需要对镜子补涂一下",
    ],
    undercoverClues: [
      "随身携带涂在嘴唇上的小管状护理用品，男女老少都用",
      "主要功效是保湿滋润、防止秋冬季节嘴唇干裂起皮",
      "膏体大多是无色透明或者淡淡的浅色，涂上很自然",
      "有很多薄荷、蜂蜜、凡士林或水果清香口味",
      "价格亲民实用，睡前厚涂一层第二天嘴唇状态会很好",
      "不需要专门卸妆，觉得嘴唇干了随时随地都能拿出来涂",
    ],
  },
  {
    id: "daily-3",
    category: "daily",
    civilianWord: "电梯",
    undercoverWord: "扶梯",
    civilianClues: [
      "现代高楼大厦里必不可少的代步升降特种设备",
      "是一个封闭的轿厢空间，进出前需要先按上下按钮等待开门",
      "进去后按下要去的楼层数字，几秒钟就能直达几十层高楼",
      "里面一般贴着镜子或广告屏，人多的时候大家会安静抬头看数字",
      "有严格的限重提示，超载时会发出蜂鸣警报不关门",
      "写字楼早高峰时等它往往需要排长队",
    ],
    undercoverClues: [
      "商场、地铁站和机场里极其常见的电动代步传送设备",
      "呈斜坡状循环运转，台阶一步步自动往上或往下移动",
      "不需要按楼层也不用等开门，随到随上连续通行效率很高",
      "两侧有同步移动的黑色橡胶扶手带，搭乘时讲究站稳扶好",
      "通常只连接相邻的上下两层楼，全开放视野可以边乘边看商场",
      "入口和出口处有黄色的梳齿踏板，穿洞洞鞋要格外留神",
    ],
  },
  {
    id: "daily-4",
    category: "daily",
    civilianWord: "太阳镜",
    undercoverWord: "泳镜",
    civilianClues: [
      "戴在眼睛上的深色或反光镜片护目装备",
      "夏天出门、海边度假或者开车遇到强光时的必备单品",
      "既能阻挡紫外线保护眼睛，又是拍照耍帅凹造型的时尚利器",
      "有飞行员款、猫眼款和偏光镜片等多种款式",
      "两条镜腿架在耳朵上，不用的时候常随手架在头顶或衣领上",
      "侦探、保镖和电影明星出场时特别喜欢戴它增强气场",
    ],
    undercoverClues: [
      "戴在眼部周围的功能性镜片装备，贴合度非常高",
      "专门在水下运动时佩戴，防止水花进眼睛并看清水底",
      "镜框周围有一圈柔软的硅胶密封圈，靠弹力胶带固定在后脑勺",
      "很多款式带有防雾涂层和镀膜，戴太久眼周会有两圈压痕",
      "去游泳馆或者海边浮潜时的标准配置",
      "离开水域走到岸上后一般会把它往上推到额头上",
    ],
  },
  {
    id: "daily-5",
    category: "daily",
    civilianWord: "枕头",
    undercoverWord: "抱枕",
    civilianClues: [
      "软绵绵的居家织物寝具，里面填充着羽绒、乳胶或棉花",
      "每天晚上躺在床上睡觉时垫在脖子与脑袋下面的必需品",
      "高度和软硬程度直接决定了睡眠质量以及第二天会不会落枕",
      "外面通常会套上一层可换洗的布罩，讲究贴肤透气",
      "酒店床铺上一般会放一软一硬两个供客人挑选",
      "形状大多是规整的长方形或贴合颈椎的波浪形",
    ],
    undercoverClues: [
      "蓬松柔软的居家布艺软装靠垫，造型五花八门",
      "主要放在客厅沙发、办公室座椅或者飘窗上",
      "看电视聊天时喜欢搂在怀里，或者垫在腰后面缓解疲劳",
      "有方形、圆形、卡通玩偶形等各种装饰性设计",
      "既是提升客厅温馨感的装饰品，也是午休趴桌睡的小帮手",
      "一般不会拿来当整晚正式睡觉的头枕",
    ],
  },
  {
    id: "daily-6",
    category: "daily",
    civilianWord: "降落伞",
    undercoverWord: "雨伞",
    civilianClues: [
      "打开后呈巨大弧形伞盖状、利用空气阻力的安全装备",
      "平时折叠收纳在背包里，从高空跃下到一定高度时拉开伞绳",
      "瞬间展开巨大的伞衣减速，让人能安全平稳地降落到地面",
      "跳伞极限运动、空降兵和航天返回舱着陆都离不开它",
      "通过双手拉动操纵绳可以控制滑翔方向和落点",
      "使用前必须经过极其严格的折叠检查，性命攸关",
    ],
    undercoverClues: [
      "家家户户玄关都备着的日常遮蔽工具，撑开呈弧形伞面",
      "平时折叠收拢，遇到阴雨天或烈日当空时推开伞骨撑在头顶",
      "由手柄、金属伞骨和防水布面组成，有长柄款也有三折便携款",
      "遇到狂风暴雨天气时如果骨架不够结实很容易被吹翻面",
      "属于最容易在地铁、出租车和便利店门口遗忘弄丢的物品之一",
      "两个人共撑一把走在雨中常被当作浪漫的电影画面",
    ],
  },
];

export function selectWordPair(
  category: WordCategory,
  roundSeed: number,
  customCivilian?: string | null,
  customUndercover?: string | null,
): WordPair {
  if (
    category === "custom" &&
    customCivilian &&
    customCivilian.trim() &&
    customUndercover &&
    customUndercover.trim()
  ) {
    const civ = customCivilian.trim();
    const und = customUndercover.trim();
    return {
      id: `custom-${roundSeed}`,
      category: "daily",
      civilianWord: civ,
      undercoverWord: und,
      civilianClues: [
        `日常生活中大家都很熟悉的事物，一共 ${civ.length} 个字`,
        "提到它的时候，大家脑海里会有很具体的画面感",
        "在同类东西里辨识度很高，平时经常会接触或聊到",
        "它的核心特点很鲜明，但细节上跟相近概念略有区别",
        "注意听前几位描述的使用场景，我这个更偏向主流常见款",
        "不用说太透，懂的人一听场景就能对上号",
      ],
      undercoverClues: [
        `平时经常能听到或见到的概念，字数是 ${und.length} 个字`,
        "和生活体验息息相关，有自己独特的使用场景",
        "功能属性很明确，在特定场合下几乎不可或缺",
        "听大家的描述感觉大方向很接近，但侧重点似乎有一点微妙差异",
        "我手里的这个特征很典型，先稳一手看看风向",
        "综合前面几位的线索，细节属性上十分耐人寻味",
      ],
    };
  }

  const pool =
    category === "all" || category === "custom"
      ? WORD_PAIRS
      : WORD_PAIRS.filter((w) => w.category === category);

  const list = pool.length > 0 ? pool : WORD_PAIRS;
  const idx = Math.floor(Math.random() * list.length);
  const chosen = list[idx] || list[0];

  if (Math.random() < 0.5) {
    return {
      id: `${chosen.id}-swap`,
      category: chosen.category,
      civilianWord: chosen.undercoverWord,
      undercoverWord: chosen.civilianWord,
      civilianClues: chosen.undercoverClues,
      undercoverClues: chosen.civilianClues,
    };
  }
  return chosen;
}

function shortSeatName(seat: Seat): string {
  return `${seat.replace("Seat", "")}号`;
}

export function initialLobby(): UndercoverLobby {
  return {
    round: 0,
    phase: "lobby",
    playerCount: 4,
    undercoverCount: 1,
    category: "all",
    customCivilianWord: null,
    customUndercoverWord: null,
    seats: {
      Seat1: "@bot:Seat1",
      Seat2: "@bot:Seat2",
      Seat3: "@bot:Seat3",
      Seat4: "@bot:Seat4",
      Seat5: null,
      Seat6: null,
    },
    ready: [],
    startsAt: null,
  };
}

export function createInitialPosition(
  round: number,
  playerCount: 4 | 6 = 4,
  undercoverCount: 1 | 2 = 1,
  category: WordCategory = "all",
  customCiv: string | null = null,
  customUnd: string | null = null,
  fixedUndercoverSeats?: Seat[],
): UndercoverPosition {
  const activeSeats = seatsForCount(playerCount);
  const actualUndercoverCount = playerCount === 4 ? 1 : undercoverCount;

  const pair = selectWordPair(category, round, customCiv, customUnd);

  let undercoverSet: Set<Seat>;
  if (fixedUndercoverSeats && fixedUndercoverSeats.length > 0) {
    undercoverSet = new Set(fixedUndercoverSeats);
  } else {
    const shuffled = [...activeSeats];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    undercoverSet = new Set(shuffled.slice(0, actualUndercoverCount));
  }

  const roles: Record<Seat, PlayerRole> = {
    Seat1: "Civilian",
    Seat2: "Civilian",
    Seat3: "Civilian",
    Seat4: "Civilian",
    Seat5: "Civilian",
    Seat6: "Civilian",
  };
  const words: Record<Seat, string> = {
    Seat1: "",
    Seat2: "",
    Seat3: "",
    Seat4: "",
    Seat5: "",
    Seat6: "",
  };

  for (const s of activeSeats) {
    if (undercoverSet.has(s)) {
      roles[s] = "Undercover";
      words[s] = pair.undercoverWord;
    } else {
      roles[s] = "Civilian";
      words[s] = pair.civilianWord;
    }
  }

  const startOffset = round > 0 ? (round - 1) % activeSeats.length : 0;
  const speakingOrder = [
    ...activeSeats.slice(startOffset),
    ...activeSeats.slice(0, startOffset),
  ];

  const emptyVotes: Record<Seat, { target: Seat; reason: string | null } | null> = {
    Seat1: null,
    Seat2: null,
    Seat3: null,
    Seat4: null,
    Seat5: null,
    Seat6: null,
  };

  const emptyLastActions = {
    Seat1: null,
    Seat2: null,
    Seat3: null,
    Seat4: null,
    Seat5: null,
    Seat6: null,
  };

  return {
    cycle: 1,
    pkRound: 0,
    pkCandidates: [],
    turn: round > 0 ? speakingOrder[0] : null,
    turnStartedAt: round > 0 ? Date.now() : null,
    activeSeats,
    aliveSeats: [...activeSeats],
    speakingOrder,
    spokenSeats: [],
    votingOrder: [...speakingOrder],
    currentVotes: emptyVotes,
    roles,
    words,
    civilianWord: pair.civilianWord,
    undercoverWord: pair.undercoverWord,
    wordPairId: pair.id,
    speeches: [],
    votes: [],
    eliminated: [],
    lastActions: emptyLastActions,
    lastEvent:
      round > 0
        ? {
            step: 0,
            kind: "deal",
            seat: speakingOrder[0],
            target: null,
            role: null,
            winner: null,
          }
        : null,
    stepCount: 0,
    winner: null,
    winReason: null,
  };
}

/**
 * Checks whether the speech illegally contains the player's own secret word verbatim.
 */
export function containsOwnSecretWord(speech: string, secretWord: string): boolean {
  if (!secretWord) return false;
  const normalizedSpeech = speech.toLowerCase().replace(/\s+/g, "");
  const normalizedWord = secretWord.toLowerCase().replace(/\s+/g, "");
  return normalizedSpeech.includes(normalizedWord);
}

export function eligibleVoteTargetsFor(
  p: UndercoverPosition,
  voter: Seat,
): Seat[] {
  const pool =
    p.pkRound > 0 && p.pkCandidates.length > 0 ? p.pkCandidates : p.aliveSeats;
  const withoutSelf = pool.filter((s) => s !== voter);
  return withoutSelf.length > 0
    ? withoutSelf
    : p.aliveSeats.filter((s) => s !== voter);
}

export function applySpeak(
  l: UndercoverLobby,
  p: UndercoverPosition,
  seat: Seat,
  rawText: string,
): { lobby: UndercoverLobby; position: UndercoverPosition } {
  if (l.phase !== "speaking") {
    throw new Error("当前不是发言陈述阶段");
  }
  if (p.turn !== seat) {
    throw new Error(`当前尚未轮到 ${shortSeatName(seat)} 发言`);
  }
  const text = rawText.trim();
  if (!text) {
    throw new Error("发言内容不能为空");
  }
  const myWord = p.words[seat];
  if (containsOwnSecretWord(text, myWord)) {
    throw new Error(
      `违规警告：你的发言不能直接包含机密词条「${myWord}」的字面本身！`,
    );
  }

  const nextStep = p.stepCount + 1;
  const nextSpoken = [...p.spokenSeats, seat];
  const nextSpeeches = [
    ...p.speeches,
    {
      step: nextStep,
      cycle: p.cycle,
      isPk: p.pkRound > 0,
      seat,
      text,
    },
  ];
  const nextLastActions = {
    ...p.lastActions,
    [seat]: {
      kind: "speak" as const,
      cycle: p.cycle,
      text,
      target: null,
      reason: null,
    },
  };

  const remainingSpeakers = p.speakingOrder.filter(
    (s) => !nextSpoken.includes(s),
  );

  if (remainingSpeakers.length > 0) {
    const nextTurn = remainingSpeakers[0];
    return {
      lobby: l,
      position: {
        ...p,
        turn: nextTurn,
        turnStartedAt: Date.now(),
        spokenSeats: nextSpoken,
        speeches: nextSpeeches,
        lastActions: nextLastActions,
        lastEvent: {
          step: nextStep,
          kind: "speak",
          seat,
          target: null,
          role: null,
          winner: null,
        },
        stepCount: nextStep,
      },
    };
  }

  const votingOrder = [...p.aliveSeats];
  const resetVotes: Record<Seat, { target: Seat; reason: string | null } | null> = {
    Seat1: null,
    Seat2: null,
    Seat3: null,
    Seat4: null,
    Seat5: null,
    Seat6: null,
  };

  return {
    lobby: {
      ...l,
      phase: "voting",
    },
    position: {
      ...p,
      turn: votingOrder[0],
      turnStartedAt: Date.now(),
      spokenSeats: nextSpoken,
      votingOrder,
      currentVotes: resetVotes,
      speeches: nextSpeeches,
      lastActions: nextLastActions,
      lastEvent: {
        step: nextStep,
        kind: "speak",
        seat,
        target: null,
        role: null,
        winner: null,
      },
      stepCount: nextStep,
    },
  };
}

export function applyVote(
  l: UndercoverLobby,
  p: UndercoverPosition,
  voter: Seat,
  target: Seat,
  rawReason?: string | null,
): { lobby: UndercoverLobby; position: UndercoverPosition } {
  if (l.phase !== "voting") {
    throw new Error("当前不是指认投票阶段");
  }
  if (p.turn !== voter) {
    throw new Error(`当前尚未轮到 ${shortSeatName(voter)} 投票`);
  }
  if (voter === target) {
    throw new Error("不能投票指认自己");
  }
  const allowedTargets = eligibleVoteTargetsFor(p, voter);
  if (!allowedTargets.includes(target)) {
    throw new Error(
      `目标必须是当前可被指认的在场席位 (${allowedTargets.map(shortSeatName).join(", ")})`,
    );
  }

  const reason = rawReason?.trim() ? rawReason.trim() : null;
  const nextStep = p.stepCount + 1;
  const nextCurrentVotes = {
    ...p.currentVotes,
    [voter]: { target, reason },
  };
  const nextVotes = [
    ...p.votes,
    {
      step: nextStep,
      cycle: p.cycle,
      isPk: p.pkRound > 0,
      voter,
      target,
      reason,
    },
  ];
  const nextLastActions = {
    ...p.lastActions,
    [voter]: {
      kind: "vote" as const,
      cycle: p.cycle,
      text: null,
      target,
      reason,
    },
  };

  const remainingVoters = p.votingOrder.filter(
    (s) => nextCurrentVotes[s] === null,
  );

  if (remainingVoters.length > 0) {
    const nextTurn = remainingVoters[0];
    return {
      lobby: l,
      position: {
        ...p,
        turn: nextTurn,
        turnStartedAt: Date.now(),
        currentVotes: nextCurrentVotes,
        votes: nextVotes,
        lastActions: nextLastActions,
        lastEvent: {
          step: nextStep,
          kind: "vote",
          seat: voter,
          target,
          role: null,
          winner: null,
        },
        stepCount: nextStep,
      },
    };
  }

  const tally: Record<Seat, number> = {
    Seat1: 0,
    Seat2: 0,
    Seat3: 0,
    Seat4: 0,
    Seat5: 0,
    Seat6: 0,
  };
  for (const s of p.votingOrder) {
    const v = nextCurrentVotes[s];
    if (v) {
      tally[v.target] = (tally[v.target] || 0) + 1;
    }
  }

  const candidatePool =
    p.pkRound > 0 && p.pkCandidates.length > 0 ? p.pkCandidates : p.aliveSeats;
  let maxVotes = -1;
  for (const c of candidatePool) {
    if (tally[c] > maxVotes) maxVotes = tally[c];
  }
  const topSeats = candidatePool.filter((c) => tally[c] === maxVotes);

  if (topSeats.length > 1 && p.pkRound === 0) {
    return {
      lobby: {
        ...l,
        phase: "speaking",
      },
      position: {
        ...p,
        pkRound: 1,
        pkCandidates: topSeats,
        turn: topSeats[0],
        turnStartedAt: Date.now(),
        speakingOrder: topSeats,
        spokenSeats: [],
        currentVotes: nextCurrentVotes,
        votes: nextVotes,
        lastActions: nextLastActions,
        lastEvent: {
          step: nextStep,
          kind: "pk_tie",
          seat: voter,
          target: topSeats[0],
          role: null,
          winner: null,
        },
        stepCount: nextStep,
      },
    };
  }

  const eliminatedSeat = topSeats[0];
  const eliminatedRole = p.roles[eliminatedSeat];
  const eliminatedWord = p.words[eliminatedSeat];
  const nextAlive = p.aliveSeats.filter((s) => s !== eliminatedSeat);
  const nextEliminated = [
    ...p.eliminated,
    {
      cycle: p.cycle,
      seat: eliminatedSeat,
      role: eliminatedRole,
      word: eliminatedWord,
      voteCount: maxVotes,
    },
  ];

  const aliveUndercovers = nextAlive.filter((s) => p.roles[s] === "Undercover");
  const aliveCivilians = nextAlive.filter((s) => p.roles[s] === "Civilian");

  let winner: PlayerRole | null = null;
  let winReason: string | null = null;

  if (aliveUndercovers.length === 0) {
    winner = "Civilian";
    winReason = "平民阵营获胜 · 卧底全部落网";
  } else if (
    aliveUndercovers.length >= aliveCivilians.length ||
    nextAlive.length <= 2
  ) {
    winner = "Undercover";
    winReason = "卧底阵营获胜 · 成功潜伏控场";
  }

  if (winner) {
    return {
      lobby: {
        ...l,
        phase: "finished",
      },
      position: {
        ...p,
        pkRound: 0,
        pkCandidates: [],
        turn: null,
        turnStartedAt: null,
        aliveSeats: nextAlive,
        currentVotes: nextCurrentVotes,
        votes: nextVotes,
        eliminated: nextEliminated,
        lastActions: nextLastActions,
        lastEvent: {
          step: nextStep,
          kind: "victory",
          seat: eliminatedSeat,
          target: eliminatedSeat,
          role: eliminatedRole,
          winner,
        },
        stepCount: nextStep,
        winner,
        winReason,
      },
    };
  }

  const nextCycle = p.cycle + 1;
  const shift = (nextCycle - 1) % nextAlive.length;
  const nextSpeakingOrder = [
    ...nextAlive.slice(shift),
    ...nextAlive.slice(0, shift),
  ];

  return {
    lobby: {
      ...l,
      phase: "speaking",
    },
    position: {
      ...p,
      cycle: nextCycle,
      pkRound: 0,
      pkCandidates: [],
      turn: nextSpeakingOrder[0],
      turnStartedAt: Date.now(),
      aliveSeats: nextAlive,
      speakingOrder: nextSpeakingOrder,
      spokenSeats: [],
      votingOrder: [...nextAlive],
      currentVotes: nextCurrentVotes,
      votes: nextVotes,
      eliminated: nextEliminated,
      lastActions: nextLastActions,
      lastEvent: {
        step: nextStep,
        kind: "eliminated",
        seat: eliminatedSeat,
        target: eliminatedSeat,
        role: eliminatedRole,
        winner: null,
      },
      stepCount: nextStep,
    },
  };
}

export function chooseBotSpeech(p: UndercoverPosition, seat: Seat): string {
  const myWord = p.words[seat];
  const baseId = p.wordPairId.replace(/-swap$/, "");
  const matchedPair = WORD_PAIRS.find((w) => w.id === baseId);

  let candidateClues: string[] = [];
  if (matchedPair) {
    if (matchedPair.civilianWord === myWord) {
      candidateClues = matchedPair.civilianClues;
    } else if (matchedPair.undercoverWord === myWord) {
      candidateClues = matchedPair.undercoverClues;
    }
  }

  const alreadyUsedTexts = new Set(p.speeches.map((s) => s.text));
  const available = candidateClues.filter(
    (c) => !alreadyUsedTexts.has(c) && !containsOwnSecretWord(c, myWord),
  );

  if (p.pkRound > 0) {
    const pkLines = [
      "大家仔细对比我上一轮的描述，我的特征非常贴合主流词，绝对不是卧底！",
      "别投错好人了！我是顺着大家共性属性说的，建议重点盯发言模棱两可的那位。",
      "冤枉啊各位探员，我刚才是怕说太透被卧底猜到词才收敛了一点！",
    ];
    for (const line of pkLines) {
      if (!alreadyUsedTexts.has(line) && !containsOwnSecretWord(line, myWord)) {
        return line;
      }
    }
  }

  if (available.length > 0) {
    const seatIdx = allSeats.indexOf(seat);
    return available[(p.cycle + seatIdx) % available.length];
  }

  const genericFallbacks = [
    `大家都很熟悉它的日常使用场景，总共是 ${myWord.length} 个字`,
    "在生活里出镜率非常高，特点很鲜明，和前面几位说的属性大体一致",
    "我手里的词偏向大家最常接触的那种款式，细节特征很明显",
    "听完一圈感觉有人的侧重点不太对劲，我先保住底牌不暴露太多",
  ];
  for (const fb of genericFallbacks) {
    if (!alreadyUsedTexts.has(fb) && !containsOwnSecretWord(fb, myWord)) {
      return fb;
    }
  }
  return "它的核心用途大家都很清楚，我跟多数人的方向是一致的。";
}

export function chooseBotVote(
  p: UndercoverPosition,
  voter: Seat,
): { target: Seat; reason: string } {
  const targets = eligibleVoteTargetsFor(p, voter);
  const myRole = p.roles[voter];

  const scored = targets.map((tSeat) => {
    let score = 10;
    const targetRole = p.roles[tSeat];
    if (myRole === "Civilian" && targetRole === "Undercover") {
      score += 12 + p.cycle * 8;
    } else if (myRole === "Undercover" && targetRole === "Civilian") {
      score += 18;
    }
    const hash =
      (allSeats.indexOf(voter) * 7 +
        allSeats.indexOf(tSeat) * 13 +
        p.stepCount) %
      11;
    score += hash;
    return { seat: tSeat, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0]?.seat || targets[0];

  const reasons = [
    `${shortSeatName(chosen)} 的描述方向跟大家有点微妙偏差，嫌疑最大！`,
    `感觉 ${shortSeatName(chosen)} 发言藏着掖着，很像在试探风向。`,
    `对比前后两句线索，${shortSeatName(chosen)} 的细节特征对不上号。`,
    `直觉告诉我 ${shortSeatName(chosen)} 拿的词跟我们不一样，先投一票！`,
  ];
  const reason =
    reasons[(p.stepCount + allSeats.indexOf(voter)) % reasons.length];
  return { target: chosen, reason };
}
