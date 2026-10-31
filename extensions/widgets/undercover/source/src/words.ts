import translatedWords from "./word-locales.json" with { type: "json" };
import extra from "./locales.json" with { type: "json" };
import auxiliary from "./extra-ui.json" with { type: "json" };
import type { WordCategory, WordPair } from "./types";

/**
 * Simplified Chinese (zh-CN) Curated Word Bank.
 */
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
      "上面有好几个 USB 充电插口，支持快充协议",
      "容量一般按毫安时计算，坐飞机有严格额定能量限制",
      "借用共享款的时候最怕找不到空槽位归还",
      "平时放包里随身带着，能给手机平板应急补电",
    ],
    undercoverClues: [
      "跟用电安全密切相关的电气装置，通常固定放在屋里",
      "主要用来把不稳定的电网电压稳定在安全范围内",
      "工厂精密仪器或者老旧小区电压波动大时必备",
      "金属外壳带散热孔，工作时有时会有轻微电流声",
      "连接在电源插座和重要电器之间，保护设备不被烧坏",
      "体积一般比较笨重，不像随身小物件那样容易携带",
    ],
  },

  // Food & Drinks (美食与饮品)
  {
    id: "food-1",
    category: "food",
    civilianWord: "拿铁",
    undercoverWord: "卡布奇诺",
    civilianClues: [
      "咖啡馆里点单率极高的一款经典奶咖",
      "浓缩咖啡里倒入大量细腻温热的蒸奶",
      "奶味非常浓郁柔和，表面常有一层薄薄的心形拉花",
      "苦味很淡容易入口，适合刚开始喝咖啡的人",
      "通常用比较大口的大杯子盛装慢慢品尝",
      "早晨或者下午茶提神醒脑的惬意陪伴",
    ],
    undercoverClues: [
      "意大利发源的传统咖啡饮品，名字很有辨识度",
      "浓缩咖啡、热牛奶和丰盈奶泡的比例非常讲究",
      "最上方是一层厚厚绵密的硬质奶泡，像戴了顶帽子",
      "喝的时候第一口往往是蓬松温热的奶沫",
      "很多咖啡师喜欢在奶泡顶上撒一层肉桂粉或可可粉",
      "咖啡风味相比普通的意式奶咖更醇厚浓郁一些",
    ],
  },
  {
    id: "food-2",
    category: "food",
    civilianWord: "可口可乐",
    undercoverWord: "百事可乐",
    civilianClues: [
      "风靡全球的碳酸饮料巨头，红白色调深入人心",
      "经典的玻璃弧形瓶和易拉罐设计极具辨识度",
      "据说核心原浆配方是世界上最顶级的商业机密之一",
      "气泡感强劲刺激，吃汉堡炸鸡或者火锅时的绝配",
      "冷藏加冰块喝第一口时会带来极大的满足感",
      "在超市饮料货架上占据着最大面积的展位之一",
    ],
    undercoverClues: [
      "家喻户晓的碳酸汽水巨头，经典标志是蓝红白圆球",
      "口味偏清甜，经常被拿来做盲测挑战的游戏",
      "历史悠久，代言阵容里常年聚集着顶级巨星和球星",
      "夏天冰镇以后开罐滋啦一声特别解渴过瘾",
      "与另一家红色包装的同类汽水展开了长达百年的竞争",
      "电影院和快餐套餐里经常能喝到的碳酸饮品",
    ],
  },
  {
    id: "food-3",
    category: "food",
    civilianWord: "汉堡包",
    undercoverWord: "肉夹馍",
    civilianClues: [
      "两片圆圆的面包中间夹着肉饼和各种蔬菜酱料",
      "西方快餐文化的代表符号，麦当劳肯德基主打单品",
      "常常搭配炸薯条和冰可乐组成经典套餐",
      "吃的时候双手拿着用防油纸裹着，大口咬下去很满足",
      "里面的肉饼有牛肉、鸡肉、鳕鱼等多种选择",
      "上面常常撒着一层香脆的白芝麻粒",
    ],
    undercoverClues: [
      "中国北方的传统特色面食，两层饼皮夹着满满的肉馅",
      "外面的白吉馍烤得金黄酥脆，有虎皮纹路",
      "里面的腊汁肉炖得软烂入味，肥而不腻瘦而不柴",
      "老师傅挥舞菜刀在案板上把热气腾腾的肉细细剁碎",
      "常常搭配一碗酸辣凉皮或者冰峰汽水一起吃",
      "起源于陕西古城，被戏称为东方古老的汉堡",
    ],
  },
  {
    id: "food-4",
    category: "food",
    civilianWord: "冰淇淋",
    undercoverWord: "冰棒",
    civilianClues: [
      "夏天最受欢迎的奶香冷冻甜品，口感细腻顺滑",
      "可以用蛋筒蛋卷盛着吃，也可以装在纸杯里用勺子挖",
      "主要由奶油、牛奶、糖和香精慢速搅拌冷冻制成",
      "有香草、巧克力、草莓、抹茶等各种丰富口味",
      "天热的时候如果吃太慢，很容易顺着手流下来",
      "很多甜品店在上面淋上巧克力酱或者坚果碎",
    ],
    undercoverClues: [
      "夏天小卖部冰柜里最常见的降温冷饮，插着一根小木棍",
      "通常是果汁、水、糖浆直接注模冻硬制成的",
      "咬起来硬邦邦脆生生的，带有明显的碎冰碴感",
      "老式绿豆口味或者老冰棍是无数人的童年回忆",
      "拿着一根长长的木柄慢慢嗦，吃完剩下一根小竹签",
      "价格通常很接地气，天热口渴时吃起来特别解暑",
    ],
  },
  {
    id: "food-5",
    category: "food",
    civilianWord: "酸奶",
    undercoverWord: "纯牛奶",
    civilianClues: [
      "由鲜乳发酵制成的乳制品，带有特有的酸甜醇厚风味",
      "口感比普通奶液更浓稠，富含有益肠道的活性益生菌",
      "可以用吸管喝，浓稠的也常常用小勺子挖着吃",
      "早餐配水果坚果麦片非常健康营养",
      "很多人喜欢舔掉包装封口盖上的那一层精华",
      "有原味、草莓味、黄桃味等各种果粒添加款式",
    ],
    undercoverClues: [
      "天然营养液体饮品，家家户户常备的白色健康饮品",
      "富含优质蛋白质和钙质，每天早晚喝一杯对身体好",
      "利乐砖包装或者玻璃瓶装，保质期有常温也有冷藏",
      "加热后表面会结出一层薄薄的奶皮",
      "闻起来是自然的奶香，没有任何人工发酵酸味",
      "常常用来冲泡燕麦、加入红茶调制奶茶或者烘焙蛋糕",
    ],
  },

  // Pop Culture & Mystery (影视文化与娱乐)
  {
    id: "culture-1",
    category: "culture",
    civilianWord: "福尔摩斯",
    undercoverWord: "柯南",
    civilianClues: [
      "世界侦探文学史上最著名的虚构神探",
      "住在伦敦贝克街 221B，身边有位老搭档叫华生",
      "擅长精妙绝伦的演绎法，观察细微痕迹就能还原真相",
      "叼着烟斗拉小提琴，戴着经典的猎鹿帽披风",
      "一生最大的宿敌是高智商犯罪大师莫里亚蒂教授",
      "由英国作家阿瑟·柯南·道尔笔下诞生的传世经典角色",
    ],
    undercoverClues: [
      "日本动漫里家喻户晓的小学生外表高中生侦探",
      "原本是知名少年侦探工藤新一，被黑衣组织灌药变小",
      "随身带着蝴蝶结变声器、麻醉手表和太阳能滑板",
      "每次破案总会射晕毛利小五郎，站在背后借声推理",
      "经典名言是：真相永远只有一个！",
      "寄住在毛利侦探事务所，暗中调查黑暗组织的阴谋",
    ],
  },
  {
    id: "culture-2",
    category: "culture",
    civilianWord: "孙悟空",
    undercoverWord: "哪吒",
    civilianClues: [
      "从东胜神洲傲来国花果山仙石中孕育诞生的神话人物",
      "手持如意金箍棒，头戴紧箍咒，会七十二般变化",
      "大闹天宫把各路天兵天将打得落花流水",
      "被压在五行山下五百年后护送唐僧西天取经",
      "拥有一双火眼金睛，翻一个筋斗云能行十万八千里",
      "中国古代四大名著《西游记》里最核心的灵魂主角",
    ],
    undercoverClues: [
      "中国古代神话里的少年英雄神将，陈塘关总兵李靖之子",
      "脚踏风火轮，手持火尖枪，臂套乾坤圈，身缠混天绫",
      "闹海抽龙筋惹祸后削骨还父削肉还母，后以莲花化身重生",
      "三头六臂神通广大，在封神演义里立下赫赫战功",
      "国漫电影里一句我命由我不由天让无数人热血沸腾",
      "额头常常点有一抹标志性的红印，扎着可爱的丸子头",
    ],
  },
  {
    id: "culture-3",
    category: "culture",
    civilianWord: "蜘蛛侠",
    undercoverWord: "蝙蝠侠",
    civilianClues: [
      "漫威旗下的平民超级英雄，高中生彼得·帕克变身而成",
      "因为不小心被放射性蜘蛛咬了一口而获得了超凡能力",
      "经典格言是：能力越大，责任越大",
      "在纽约曼哈顿摩天大楼之间发射蛛丝飞荡穿梭",
      "穿着一身红蓝配色的贴身战衣，喜欢在战斗中讲冷笑话",
      "自称好邻居超级英雄，平时要打工拍照交房租",
    ],
    undercoverClues: [
      "DC 漫画旗下的黑暗骑士，哥谭市黑夜里的守护者",
      "白天是富可敌国的韦恩企业总裁布鲁斯·韦恩",
      "本身没有任何超能力，依靠顶级格斗术和高科技战车装备",
      "童年目睹父母在犯罪巷被枪杀，从此立志扫除罪恶",
      "在秘密蝙蝠洞里研究装备，身边有忠诚的管家阿尔弗雷德",
      "宿敌是哥谭市制造混乱与恐怖的小丑",
    ],
  },
  {
    id: "culture-4",
    category: "culture",
    civilianWord: "哈利波特",
    undercoverWord: "甘道夫",
    civilianClues: [
      "额头上有一道标志性的闪电形伤疤，大难不死的男孩",
      "在十一岁生日那天收到了霍格沃茨魔法学校的录取信",
      "骑着飞天扫帚打魁地奇，分院仪式上被分到了格兰芬多",
      "手里的魔杖内芯是凤凰羽毛，最擅长的咒语是除你武器",
      "身边有两个形影不离的铁三角好友罗恩和赫敏",
      "与伏地魔展开了跨越七个学年的正邪宿命决战",
    ],
    undercoverClues: [
      "指环王中土世界最睿智伟大的灰袍与白袍巫师",
      "头戴尖顶宽檐帽，蓄着雪白的长胡须，手持法杖和宝剑",
      "在莫瑞亚矿坑深处独战炎魔，大喊经典名言：你休想通过！",
      "骑着神驹捷影四处奔走，联络精灵、矮人和人类抵抗黑暗",
      "引导弗罗多和护戒使者跨越万难护送魔戒前往末日火山",
      "平时神龙见首不见尾，喜欢在霍比特人的夏尔抽烟袋放烟花",
    ],
  },
  {
    id: "culture-5",
    category: "culture",
    civilianWord: "魔术师",
    undercoverWord: "催眠师",
    civilianClues: [
      "在舞台上通过精巧手法和道具机关创造神奇视觉奇迹的艺人",
      "经典表演包括空手变鸽子、大变活人、帽子抓兔子和撕牌还原",
      "严守行业行规，绝不在外行面前轻易揭秘戏法背后的秘密",
      "穿着黑色燕尾服，挥舞着魔术棒，伴随着激昂的舞台背景音乐",
      "依靠转移观众注意力和巧妙的手法盲区来达成不可思议的效果",
      "春晚舞台上的常客，一句接下来就是见证奇迹的时刻耳熟能详",
    ],
    undercoverClues: [
      "通过温和语言暗示和诱导带领他人进入深度潜意识专注状态的人",
      "常常用一块慢慢摇晃的怀表或者轻柔节奏的呼吸引导放松",
      "在心理治疗或者舞台娱乐表演中引导他人回忆或者做出特殊举动",
      "打一个响指或者下一句指令就能让受试者逐渐清醒过来",
      "讲究与受试者建立高度的心理信任感，属于心理学应用范畴",
      "电影里常被神秘化为能悄悄控制他人思想和行为的幕后高人",
    ],
  },

  // Daily Life (日常百态)
  {
    id: "daily-1",
    category: "daily",
    civilianWord: "电梯",
    undercoverWord: "扶梯",
    civilianClues: [
      "高层建筑和商场里必不可少的垂直代步封闭轿厢",
      "靠钢丝绳和配重块上下拉动，几秒钟就能升降十几层",
      "里面有一排数字楼层按钮，配有关门开门键和紧急呼叫警铃",
      "写字楼早高峰时等它往往需要排长队",
      "超载时会发出哔哔警报声而且拒不关门",
      "遇到故障停电时可能会被困在两层楼之间的井道里",
    ],
    undercoverClues: [
      "商场、地铁站和机场里连续运转倾斜运送客流的循环阶梯",
      "两边有与台阶同步同向缓缓移动的黑色橡胶扶手带",
      "通常只连接相邻的上下两层楼，全开放视野可以边乘边看商场",
      "站立时要面向运行方向，踩在黄线安全区域内并握紧扶手",
      "上下两头配有紧急红色急停按钮以应对夹人意外",
      "人流量大时源源不断运送，不需要像箱式那样在门外苦等",
    ],
  },
  {
    id: "daily-2",
    category: "daily",
    civilianWord: "雨伞",
    undercoverWord: "雨衣",
    civilianClues: [
      "阴雨天或者烈日当空出门时单手撑在头顶的遮蔽工具",
      "由伞柄、金属骨架和防水伞面组成，有长柄款和折叠便携款",
      "大风暴雨天气时如果伞骨不够结实很容易被吹翻面",
      "属于在地铁、出租车和便利店门口最容易被遗忘弄丢的物品之一",
      "两个人同撑一把在雨中漫步常被当作浪漫的偶像剧桥段",
      "收拢以后上面残留很多水珠，进室内需要装进塑料保护套",
    ],
    undercoverClues: [
      "下雨天直接穿在身上的防水防护服饰，带有一顶连体帽子",
      "能把整个上半身和躯干完全裹住，彻底解放双手不受束缚",
      "骑电动车、自行车通勤或者雨中徒步时的必备挡雨装备",
      "通常由轻便耐磨的 PVC、尼龙或者透气防水胶膜制成",
      "穿上后行动很方便，不怕狂风吹翻也不需要用手时刻握着杆子",
      "小学生放学或者环卫工人雨天作业时常常穿亮黄色的款式",
    ],
  },
  {
    id: "daily-3",
    category: "daily",
    civilianWord: "过山车",
    undercoverWord: "海盗船",
    civilianClues: [
      "大型游乐园里最刺激排队最火爆的王牌轨道机动项目",
      "列车车厢沿着高低起伏翻滚盘旋的钢轨飞速疾驰",
      "包含近乎垂直的大俯冲、360度大回环和强烈的失重体验",
      "全程风驰电掣，融合了失重感、超重感和急速转弯",
      "坐上去必须拉下压肩式或者压腿式安全压杆锁死",
      "游客往往从头到尾紧闭双眼尖叫不断，下来时腿都在打颤",
    ],
    undercoverClues: [
      "游乐园里模拟在惊涛骇浪狂风中剧烈前后摇摆的大船造型设施",
      "悬挂在四个巨大的立柱钢架下方，像一个巨大的秋千往复摆动",
      "随着摆动幅度越来越大，最高点几乎与地面垂直接近90度",
      "坐在船头和船尾两端的人感受到的失重坠落刺激最为强烈",
      "伴随着风声呼啸，每次摆到顶点再下坠时全船人齐声尖叫",
      "外观通常彩绘成维京战船或者加勒比大帆船的复古造型",
    ],
  },
  {
    id: "daily-4",
    category: "daily",
    civilianWord: "墨镜",
    undercoverWord: "泳镜",
    civilianClues: [
      "烈日晴天下戴在眼睛前面的遮光眼镜，镜片颜色比较深",
      "主要用来阻挡刺眼的强光和紫外线，保护视力不受伤害",
      "夏天去海边沙滩度假或者开车自驾时的必备时尚单品",
      "有很多经典的蛤蟆镜、飞行员款或者黑超大框造型",
      "戴上之后周围的光线瞬间暗下来，拍照凹造型特别酷炫",
      "架在鼻梁上挂在耳朵两侧，进入室内一般会摘下挂在领口",
    ],
    undercoverClues: [
      "去水上乐园游泳或者深水潜水时必须紧扣在眼眶上的防水眼镜",
      "镜圈边缘配有硅胶密封吸盘，能把眼周牢牢吸住防止渗水",
      "靠一根有弹性的橡胶带紧紧勒在后脑勺上防止滑脱",
      "镜片内侧通常涂有防雾图层，保证在水下能清晰视物睁开眼睛",
      "能有效隔绝泳池里的消毒氯水和海里的咸水刺激眼球",
      "游完上岸摘下来时，眼眶周围经常会被压出一圈明显的红印子",
    ],
  },
  {
    id: "daily-5",
    category: "daily",
    civilianWord: "降落伞",
    undercoverWord: "遮阳伞",
    civilianClues: [
      "高空跳伞或者紧急逃生时用来减缓下落速度的巨大织物伞盖",
      "平时整整齐齐折叠打包在专用的背负伞包里，开伞后迎风张开",
      "依靠极大的空气阻力使人体或载荷平稳轻柔地降落地面",
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

/**
 * Traditional Chinese (zh-TW) Curated Word Bank.
 */
export const WORD_PAIRS_ZHTW: WordPair[] = [
  {
    id: "tech-1",
    category: "tech",
    civilianWord: "ChatGPT",
    undercoverWord: "DeepSeek",
    civilianClues: [
      "經常陪我寫程式碼修文案的對話式大模型助手",
      "最早掀起全球生成式 AI 浪潮的代表性產品",
      "背靠矽谷知名實驗室，圖標像一朵旋轉的花朵",
      "支援語音和視覺多模態，訂閱會員叫 Plus",
    ],
    undercoverClues: [
      "能力很強的對話式大模型助手，寫程式碼推理都很順暢",
      "因為極致性價比和開源推理模型轟動全球的 AI",
      "圖標是一隻藍色的鯨魚，近期全球知名度極高",
      "思考過程會直接展示出來，經常帶著深度思考標籤",
    ],
  },
  {
    id: "tech-2",
    category: "tech",
    civilianWord: "藍牙耳機",
    undercoverWord: "助聽器",
    civilianClues: [
      "平時戴在耳朵上的小巧電子設備，不需要插線",
      "通勤坐捷運或運動慢跑時幾乎人手一副",
      "一般配有一個充電盒，支援主動降噪功能",
      "主要用來聽音樂、講電話或看影片串流",
    ],
    undercoverClues: [
      "戴在耳朵上的精密微型電子裝置，體積非常小",
      "能把外界的聲音處理放大後清晰地傳進耳道",
      "主要幫助聽力受損或年長者聽清日常交談",
      "需要根據每個人的情況進行專業調試驗配",
    ],
  },
  {
    id: "tech-3",
    category: "tech",
    civilianWord: "機械鍵盤",
    undercoverWord: "打字機",
    civilianClues: [
      "用手指敲擊輸入文字的設備，段落感特別明顯",
      "敲起來劈哩啪啦響，不同軸體手感聲音完全不同",
      "工程師和電競玩家的最愛，鍵帽可以自己更換客製",
      "放在電腦桌面上使用，有紅軸、青軸、茶軸之分",
    ],
    undercoverClues: [
      "敲擊按鍵來輸出文字的經典機械裝置，聲音清脆",
      "每按下一鍵都會帶動金屬字錘敲在色帶和紙張上",
      "不需要連接螢幕，敲出來的字直接印在實體紙上",
      "每打完一行需要手動推一下滾筒換行，還會叮一聲",
    ],
  },
  {
    id: "tech-4",
    category: "tech",
    civilianWord: "無人機",
    undercoverWord: "風箏",
    civilianClues: [
      "能在天空中飛行的科技設備，地面有人專門遙控操縱",
      "靠多組高速旋轉的螺旋槳提供升力，還能穩定懸停",
      "常拿來航拍風景、地形巡檢或夜間燈光秀表演",
      "內建電池和相機，沒電或訊號中斷會自動返航",
    ],
    undercoverClues: [
      "飛在半空中的物件，需要地面上的人時刻牽引控制",
      "必須借助戶外自然風力才能順利升上高空",
      "有一根長長的線連在手中的線輪上緩緩放線",
      "春天公園草坪上很常見，有燕子老鷹等各種造型",
    ],
  },
  {
    id: "tech-5",
    category: "tech",
    civilianWord: "行動電源",
    undercoverWord: "穩壓器",
    civilianClues: [
      "跟充電有關的隨身實用設備，方方正正像塊小磚頭",
      "出門旅遊或逛街手機快沒電時的急救神物",
      "上面有多個充電插孔，支援各種快充通訊協定",
      "容量一般按毫安時計算，搭飛機有額定能量攜帶限制",
    ],
    undercoverClues: [
      "跟用電安全密切相關的電氣裝置，通常固定安裝在室內",
      "主要用來把不穩定的電網電壓穩定在安全標準範圍",
      "精密儀器設備或電壓波動較大的老舊環境必備",
      "金屬外殼帶散熱孔，工作時偶爾會有輕微電流嗡嗡聲",
    ],
  },
  {
    id: "food-1",
    category: "food",
    civilianWord: "拿鐵",
    undercoverWord: "卡布奇諾",
    civilianClues: [
      "咖啡店裡點單率極高的一款經典義式奶香咖啡",
      "濃縮咖啡裡倒入大量溫熱細緻的綿密蒸奶",
      "奶味非常濃郁滑順，表面常有精美的心形拉花",
      "苦味淡雅容易入口，深受廣大咖啡愛好者喜愛",
    ],
    undercoverClues: [
      "源自義大利的傳統咖啡飲品，配方比例十分講究",
      "濃縮咖啡、熱牛奶和豐盈奶泡各佔三分之一",
      "最上方是一層厚厚綿密的奶泡層，頂部常灑肉桂粉",
      "咖啡濃醇風味比起普通拿鐵更鮮明強烈一些",
    ],
  },
  {
    id: "food-2",
    category: "food",
    civilianWord: "可口可樂",
    undercoverWord: "百事可樂",
    civilianClues: [
      "風靡全球的碳酸飲料巨頭，紅白色調深入人心",
      "經典的曲線玻璃瓶與紅色易開罐極具辨識度",
      "據說原漿配方是世界上最機密的商業機密之一",
      "氣泡感強勁刺激，吃漢堡炸雞或披薩時的絕配",
    ],
    undercoverClues: [
      "家喻戶曉的碳酸汽水巨頭，經典標誌是藍紅白圓球",
      "口味偏清甜，歷史上經常發起盲測盲飲挑戰活動",
      "常年由全球頂級流行樂巨星與體壇名將熱情代言",
      "與另一家紅色包裝的對手展開了長達百年的飲料大戰",
    ],
  },
  {
    id: "food-3",
    category: "food",
    civilianWord: "漢堡",
    undercoverWord: "三明治",
    civilianClues: [
      "兩片圓圓的麵包中間夾著肉排和生菜起司醬料",
      "速食文化的代表美食，連鎖速食巨頭的核心單品",
      "常常搭配香脆薯條和冰涼碳酸飲料組成經典套餐",
      "吃的時候雙手捧著防油紙大口咬下，非常飽足過癮",
    ],
    undercoverClues: [
      "兩片切片吐司麵包中間夾入火腿、蛋或生菜的美食",
      "相傳源自十八世紀英國貴族為了玩牌不弄髒手指發明",
      "常切成三角形對半剖開，擺放整齊方便隨手享用",
      "野餐郊遊、通勤早餐店不可或缺的方便輕食",
    ],
  },
  {
    id: "food-4",
    category: "food",
    civilianWord: "冰淇淋",
    undercoverWord: "冰棒",
    civilianClues: [
      "夏天極受歡迎的奶香冰品甜點，口感綿密順滑",
      "可以用脆皮甜筒裝著吃，也可以裝在紙杯用小湯匙舀",
      "主要由鮮奶油、牛奶和糖慢速攪拌冷凍製成",
      "天氣炎熱時如果吃太慢，融化時容易流到手上",
    ],
    undercoverClues: [
      "夏天冰櫃裡最常見的消暑冰品，插著一根小木棍棒",
      "通常是果汁或糖水直接注模凍硬製成的硬脆冰品",
      "咬起來爽脆清涼，帶有明顯的冰晶碎粒顆粒感",
      "拿著木柄慢慢品嚐，吃完手上剩下一根扁平小竹籤",
    ],
  },
  {
    id: "food-5",
    category: "food",
    civilianWord: "優格",
    undercoverWord: "鮮牛奶",
    civilianClues: [
      "由乳品經乳酸菌發酵製成的乳製品，帶特有酸甜風味",
      "口感比普通牛奶濃稠滑潤，富含益生菌幫助消化",
      "早餐搭配新鮮水果丁或燕麥堅果脆片十分健康營養",
      "濃稠膏狀質地，常裝在小塑膠杯中用湯匙舀著吃",
    ],
    undercoverClues: [
      "天然營養液態乳品，日常生活中常備的白色健康飲品",
      "富含優質蛋白質和豐富鈣質，早晨喝一杯補充活力",
      "利樂紙盒或透明玻璃瓶裝，冷藏或常溫保存皆常見",
      "聞起來是純粹溫和的天然乳香，完全不帶發酵酸味",
    ],
  },
  {
    id: "culture-1",
    category: "culture",
    civilianWord: "福爾摩斯",
    undercoverWord: "柯南",
    civilianClues: [
      "世界偵探文學史上最著名的傳奇虛構神探",
      "居住在倫敦貝克街 221B，身旁有位忠實助手華生醫生",
      "精通縝密的演繹推理法，觀察微小痕跡即可洞悉真相",
      "叼著煙斗拉奏小提琴，戴著經典的獵鹿帽與風衣",
    ],
    undercoverClues: [
      "日本漫畫裡家喻戶曉的小學生外貌高中生名偵探",
      "原本是高中生偵探工藤新一，遭神秘黑衣組織灌藥變小",
      "隨身攜帶蝴蝶結變聲器、麻醉手錶和渦輪滑板",
      "經典口頭禪是：真相永遠只有一個！",
    ],
  },
  {
    id: "culture-2",
    category: "culture",
    civilianWord: "孫悟空",
    undercoverWord: "哪吒",
    civilianClues: [
      "從花果山仙石中孕育而生的東方神話傳奇齊天大聖",
      "手持如意金箍棒，頭戴金箍圈，精通七十二種變化",
      "大鬧天宮戰力無雙，後護送唐三藏西天取經降妖伏魔",
      "擁有能看破虛實的火眼金睛，翻個筋斗雲可行十萬八千里",
    ],
    undercoverClues: [
      "中國神話中陳塘關李靖總兵的三公子，少年英雄神將",
      "腳踏風火輪、手持火尖槍、臂套乾坤圈、身纏混天綾",
      "經歷鬧海削肉還母考驗後，獲太乙真人以蓮花化身重生",
      "額頭常繪有標誌性紅色印記，綁著俏皮的雙丸子髮髻",
    ],
  },
  {
    id: "culture-3",
    category: "culture",
    civilianWord: "蜘蛛人",
    undercoverWord: "蝙蝠俠",
    civilianClues: [
      "漫威旗下的高中生超級英雄，平民高中生彼得帕克化身",
      "因意外遭到放射性蜘蛛叮咬而獲得飛簷走壁的神奇能力",
      "座右銘是名言：能力越大，責任越大",
      "身穿紅藍相間緊身戰衣，在紐約高樓大廈間發射蛛絲擺盪",
    ],
    undercoverClues: [
      "DC 漫畫旗下的黑暗騎士，高譚市暗夜裡的罪惡剋星",
      "白天是家財萬貫的布魯斯韋恩，自身沒有任何超能力",
      "依靠頂尖格鬥體能、高科技戰車裝甲和偵探頭腦作戰",
      "在秘密蝙蝠洞籌劃行動，身邊有忠誠管家阿福全力支援",
    ],
  },
  {
    id: "culture-4",
    category: "culture",
    civilianWord: "哈利波特",
    undercoverWord: "甘道夫",
    civilianClues: [
      "額頭上有一道傳奇閃電形傷疤的巫師男孩",
      "十一歲那年收到霍格華茲魔法學校的貓頭鷹錄取信",
      "騎乘飛天掃帚參加魁地奇賽事，被分類帽分至葛來分多",
      "與榮恩、妙麗組成鐵三角，歷經七年與黑魔王對決",
    ],
    undercoverClues: [
      "魔戒中土世界裡最睿智強大的灰袍與白袍邁雅巫師",
      "身穿長袍手持木杖，留著雪白長鬍，戴著藍色尖頂帽",
      "在地底橋樑面對炎魔時大聲喝斥經典台詞：你休想通過！",
      "引導佛羅多與魔戒遠征隊翻山越嶺前往末日火山銷毀魔戒",
    ],
  },
  {
    id: "culture-5",
    category: "culture",
    civilianWord: "魔術師",
    undercoverWord: "催眠師",
    civilianClues: [
      "在舞台上透過巧妙手速與機關道具創造奇幻視覺效果的藝人",
      "招牌表演包含帽子變鴿子、空手變撲克牌與大箱分割術",
      "恪守嚴格行業保密戒律，絕不在外人面前隨意拆解秘密",
      "身穿燕尾服揮舞指揮棒，伴隨緊湊背景音樂見證奇蹟時刻",
    ],
    undercoverClues: [
      "透過語言暗示與引導協助他人進入深層潛意識專注狀態的人",
      "經常藉由有節奏的擺動懷表或柔和呼吸口令幫助對象放鬆",
      "廣泛應用於心理諮商減壓或舞台娛樂互動演出中",
      "只要輕輕彈個響指或下達喚醒指令，受試者便隨之回神清醒",
    ],
  },
  {
    id: "daily-1",
    category: "daily",
    civilianWord: "電梯",
    undercoverWord: "手扶梯",
    civilianClues: [
      "高樓建築裡不可或缺的垂直升降密閉代步鋼纜車廂",
      "幾秒鐘內就能快速攀升十幾層樓，省去爬樓梯辛勞",
      "內部有數位樓層按鈕面盤，設有緊急呼救求助對講機",
      "上班尖峰時段在辦公大樓大廳往往大排長龍等待搭乘",
    ],
    undercoverClues: [
      "百貨商場、捷運站與機場裡連續斜向運轉的循環式金屬階梯",
      "兩側配有同速平移前進的黑色橡膠防滑扶手帶",
      "通常只跨接相鄰上下兩樓層，開放式視野能一邊搭乘一邊環顧",
      "搭乘時請緊握扶手站穩踏階，依動線靠邊禮讓他人通行",
    ],
  },
  {
    id: "daily-2",
    category: "daily",
    civilianWord: "雨傘",
    undercoverWord: "雨衣",
    civilianClues: [
      "遇到落雨天或烈日驕陽時單手撐在頭頂上方的遮蔽防護工具",
      "由手柄、傘骨金屬支架與防水布組成，有長傘也有折疊傘款",
      "在大風暴雨中如果傘骨強度不夠很容易整把被吹翻開花",
      "常在捷運車廂、計程車或便利商店傘架被粗心遺忘遺落",
    ],
    undercoverClues: [
      "下雨天直接穿套在身上的連帽防水防護外衣",
      "能將整個上半身與軀幹完全罩住，徹底解放雙手自由",
      "騎機車、自行車通勤或雨中登山健行時的標配防濕裝備",
      "穿上後行動靈活方便，無懼強風吹翻也不用手持握柄支撐",
    ],
  },
  {
    id: "daily-3",
    category: "daily",
    civilianWord: "雲霄飛車",
    undercoverWord: "海盜船",
    civilianClues: [
      "大型主題遊樂園裡最熱門排隊最長的招牌軌道機動設施",
      "列車沿著起伏盤旋的鋼製軌道以極高速度翻騰狂飆",
      "包含近乎垂直的大俯衝、螺旋翻滾與極其劇烈的失重體驗",
      "遊客往往全程尖叫不斷，雙手緊抓安全壓桿下來時雙腿發軟",
    ],
    undercoverClues: [
      "遊樂園裡模擬在巨浪暴風中大幅度前後擺盪的龐大木船設施",
      "懸掛在四根巨型立柱鋼架下方，如同一座巨大鞦韆前後盪漾",
      "隨著擺動角度逐漸加劇，最高點幾乎能與地面垂直達到九十度",
      "坐在船頭與船尾兩端的人所感受到的重力下墜刺激最為劇烈",
    ],
  },
  {
    id: "daily-4",
    category: "daily",
    civilianWord: "太陽眼鏡",
    undercoverWord: "泳鏡",
    civilianClues: [
      "艷陽高照晴天時戴在眼前方的濾光深色鏡片眼鏡",
      "主要用來阻擋刺眼強光與紫外線侵害，保護雙眼視力舒適",
      "夏天海灘渡假、開車自駕出遊不可或缺的流行時尚配件",
      "戴上後周圍光線瞬間柔和暗下，拍照造型極具帥氣個性",
    ],
    undercoverClues: [
      "在游泳池戲水或深水潛泳時緊貼眼窩的防水保護眼罩",
      "鏡框周邊配有親膚矽膠密封吸盤，緊緊貼合眼圈防止池水滲漏",
      "靠一條高彈性矽膠扁帶緊扣後腦勺防止跳水時鬆脫滑落",
      "內側具備防霧塗層，能隔絕池中消毒氯水刺激眼球保持視野清澈",
    ],
  },
  {
    id: "daily-5",
    category: "daily",
    civilianWord: "降落傘",
    undercoverWord: "遮陽傘",
    civilianClues: [
      "高空跳傘或太空艙返回時藉由空氣阻力減緩下墜速度的大型傘布",
      "平時精密折疊打包在後背包中，拉開導引傘後迎風完全膨脹展開",
      "藉由巨大空氣阻力使人員或物資輕緩安全地降落在著陸區域",
      "操作者手拉操縱拉繩可精準微調滑翔航向與最終落地點",
    ],
    undercoverClues: [
      "日常生活中常備的隨身遮陽工具，撐開呈現弧形傘面",
      "晴空萬里紫外線強烈時推開傘架遮蔽烈日，帶有抗紫外線防曬塗層",
      "常設計為輕巧好收納的三折或五折款，方便放入隨身包包中攜帶",
      "漫步林蔭大道或海濱小鎮時撐著散步，優雅防曬阻隔熱氣",
    ],
  },
];

/**
 * Authentic English (en) Curated Word Bank.
 */
export const WORD_PAIRS_EN: WordPair[] = [
  // Tech & Digital
  {
    id: "tech-1",
    category: "tech",
    civilianWord: "ChatGPT",
    undercoverWord: "Claude",
    civilianClues: [
      "A conversational AI assistant developed by a well-known lab in San Francisco.",
      "Pioneered the worldwide generative AI boom with its iconic green spinning logo.",
      "Widely used by knowledge workers for coding assistance and drafting written copy.",
      "Offers interactive voice mode, canvas editing, and a premium tier named Plus.",
    ],
    undercoverClues: [
      "A thoughtful and articulate conversational AI assistant crafted by Anthropic.",
      "Celebrated for its expansive context window and natural, human-like reasoning style.",
      "Widely trusted by software developers for deep codebase comprehension and coding.",
      "Its flagship model generation series is distinguished by tiers like Sonnet and Opus.",
    ],
  },
  {
    id: "tech-2",
    category: "tech",
    civilianWord: "Earbuds",
    undercoverWord: "Hearing Aid",
    civilianClues: [
      "Compact wireless audio capsules placed directly inside your ear canals.",
      "Accompanied by a pocket-sized flip-top battery case with noise cancellation.",
      "Standard listening companion on the subway, during cardio workouts, or while walking.",
      "Losing one side of the pair down a train platform gap is a commuter nightmare.",
    ],
    undercoverClues: [
      "A discreet miniature electronic assistive device worn in or behind the ear.",
      "Captures ambient speech through microphones and amplifies sound frequencies clearly.",
      "Tailored and programmed by audiologists to help seniors follow conversations.",
      "Categorized as specialized medical equipment that restores everyday acoustic clarity.",
    ],
  },
  {
    id: "tech-3",
    category: "tech",
    civilianWord: "Keyboard",
    undercoverWord: "Typewriter",
    civilianClues: [
      "A computer desktop peripheral with rows of keys for inputting text and commands.",
      "Types with distinct tactile clicks, beloved by gamers, writers, and software coders.",
      "Often customized with colorful keycaps, mechanical switches, and glowing RGB lights.",
      "Categorized by switch styles like Linear, Clicky, or Tactile variants.",
    ],
    undercoverClues: [
      "A vintage manual writing machine that prints letters directly onto physical paper.",
      "Each keypress strikes an inked ribbon against paper with an unmistakable clacking noise.",
      "Does not need a computer monitor or power outlet to type out documents.",
      "Features a rotating roller platen and a manual carriage return that dings with a bell.",
    ],
  },
  {
    id: "tech-4",
    category: "tech",
    civilianWord: "Drone",
    undercoverWord: "Kite",
    civilianClues: [
      "A remotely piloted multicopter that hovers in mid-air using spinning propellers.",
      "Equipped with high-definition gimbal cameras to capture sweeping landscape footage.",
      "Fitted with GPS satellite positioning and an automatic return feature on low battery.",
      "Regulated by aviation authorities with strictly designated no-fly zones around airports.",
    ],
    undercoverClues: [
      "A tethered aerodynamic craft made of lightweight fabric stretched over a framework.",
      "Rises into the sky propelled entirely by steady natural outdoor breezes.",
      "Controlled from the ground using a handheld line reel wound with sturdy string.",
      "Traditional springtime sight floating over breezy open public park meadows.",
    ],
  },
  {
    id: "tech-5",
    category: "tech",
    civilianWord: "Power Bank",
    undercoverWord: "Generator",
    civilianClues: [
      "A portable rectangular lithium battery pack used to recharge mobile gadgets on the go.",
      "An essential travel lifesaver when your smartphone battery drains while out and about.",
      "Equipped with USB-A and USB-C output ports supporting fast charging protocols.",
      "Must clearly display its milliamp-hour capacity to pass airport security checkpoints.",
    ],
    undercoverClues: [
      "A heavy-duty machine that converts mechanical or fuel energy into electrical current.",
      "Kicks into action to supply backup electricity when neighborhood power grids fail.",
      "Commonly fueled by diesel or gasoline, humming loudly outside construction sites.",
      "Stationary emergency equipment indispensable for hospitals and off-grid remote cabins.",
    ],
  },

  // Food & Drinks
  {
    id: "food-1",
    category: "food",
    civilianWord: "Latte",
    undercoverWord: "Cappuccino",
    civilianClues: [
      "A popular Italian-inspired espresso beverage prepared with plenty of steamed milk.",
      "Finished with a delicate thin layer of microfoam, often adorned with pretty leaf art.",
      "Milder, creamier, and smoother than an Americano or concentrated cortado.",
      "One of the most frequently ordered morning coffee drinks across cafes worldwide.",
    ],
    undercoverClues: [
      "A traditional espresso drink layered with equal thirds of coffee, milk, and thick foam.",
      "Crowned with a tall, airy dome of frothy foam dusted with cocoa powder.",
      "Has a distinctly bolder, more pronounced coffee punch beneath its velvety head.",
      "Customarily enjoyed in Italy exclusively during morning breakfast hours alongside pastries.",
    ],
  },
  {
    id: "food-2",
    category: "food",
    civilianWord: "Coca-Cola",
    undercoverWord: "Pepsi",
    civilianClues: [
      "The iconic dark carbonated soft drink served in famous bright red aluminum cans.",
      "Features a legendary secret recipe syrup formulated over a century ago in Atlanta.",
      "Delivers a crisp vanilla-and-spice effervescence that pairs with burgers and popcorn.",
      "Its holiday advertising historically popularized the modern cheerful Santa Claus imagery.",
    ],
    undercoverClues: [
      "A famous sweet carbonated soda recognizable by its blue, red, and white circular globe logo.",
      "Characterized by a slightly sweeter, citrus-forward burst of flavor on the initial taste.",
      "Famously sponsored high-profile musical superstars and stadium halftime entertainment.",
      "Pioneered blind taste test marketing campaigns comparing rival sodas in supermarket aisles.",
    ],
  },
  {
    id: "food-3",
    category: "food",
    civilianWord: "Burger",
    undercoverWord: "Sandwich",
    civilianClues: [
      "A warm fast-food meal featuring a seasoned patty nestled inside a sliced round bun.",
      "Topped with melted cheddar cheese, crisp lettuce, tomato slices, pickles, and condiments.",
      "Universal diner favorite usually served alongside golden French fries and milkshakes.",
      "Gripped with both hands inside a paper wrapping wrapper at takeout drive-thru windows.",
    ],
    undercoverClues: [
      "A versatile meal prepared by layering deli meats, cheeses, and spreads between sliced bread.",
      "Named after an 18th-century British earl who wished to eat without pausing his card games.",
      "Frequently assembled using square bread slices diagonally cut into triangular halves.",
      "A quintessential brown-bag lunchbox staple for school breaks, picnics, and office desks.",
    ],
  },
  {
    id: "food-4",
    category: "food",
    civilianWord: "Ice Cream",
    undercoverWord: "Popsicle",
    civilianClues: [
      "A rich frozen dairy treat churned with sweetened cream, milk, sugar, and flavorings.",
      "Served in waffle cones, cups, or sundae bowls with toppings like fudge and sprinkles.",
      "Whipped during freezing to incorporate air, yielding a smooth and scoopable consistency.",
      "Summer staple sold in parlors across classic flavors like vanilla and chocolate chip.",
    ],
    undercoverClues: [
      "A refreshing water-based flavored frozen snack mounted on a flat wooden stick.",
      "Made by freezing fruit juice, syrup, or puree solid inside vertical molds.",
      "Licked or bitten directly off its wooden handle, often in bright cherry or blue raspberry hues.",
      "Can drip sticky colorful syrup down your fingers if it melts too quickly under the hot sun.",
    ],
  },
  {
    id: "food-5",
    category: "food",
    civilianWord: "Yogurt",
    undercoverWord: "Milk",
    civilianClues: [
      "A creamy fermented dairy product cultured with live beneficial probiotic bacteria.",
      "Has a pleasant tangy, slightly tart flavor, often sweetened with honey or berry compote.",
      "Scooped out of plastic tubs with a spoon or layered into breakfast fruit parfaits.",
      "Greek-style strained varieties are prized for their thick texture and high protein content.",
    ],
    undercoverClues: [
      "A wholesome white nutrient-dense liquid produced by mammals, primarily dairy cows.",
      "Poured over breakfast cereals, added into hot tea, or stirred into pancake batter.",
      "Stored inside cardboard cartons or plastic gallon jugs inside the refrigerator door.",
      "Classified by butterfat levels such as whole, reduced fat, low-fat, or skim varieties.",
    ],
  },

  // Pop Culture & Mystery
  {
    id: "culture-1",
    category: "culture",
    civilianWord: "Sherlock Holmes",
    undercoverWord: "Hercule Poirot",
    civilianClues: [
      "A legendary Victorian consulting detective operating out of 221B Baker Street in London.",
      "Solves baffling criminal cases through brilliant forensic deduction, accompanied by Dr. Watson.",
      "Iconic visual silhouette features a deerstalker cap, an Inverness cape, and a curved pipe.",
      "Locked in an intellectual duel of wits against the criminal mastermind Professor Moriarty.",
    ],
    undercoverClues: [
      "A renowned Belgian private investigator celebrated for his meticulously waxed mustache.",
      "Cracks sensational cases like the Orient Express relying on the precision of his little grey cells.",
      "Obsessed with supreme order, neatness, and symmetry in all daily domestic matters.",
      "The world-famous detective protagonist created by celebrated mystery author Agatha Christie.",
    ],
  },
  {
    id: "culture-2",
    category: "culture",
    civilianWord: "Spider-Man",
    undercoverWord: "Batman",
    civilianClues: [
      "A witty teenage superhero who swings between Manhattan skyscrapers on synthetic webbing.",
      "Acquired acrobatic wall-crawling abilities after an accidental radioactive arachnid bite.",
      "Guided by the immortal moral principle that with great power comes great responsibility.",
      "Underneath the red and blue masked suit is a brilliant science student named Peter Parker.",
    ],
    undercoverClues: [
      "The grim vigilante protector of Gotham City who fights crime without any superhuman powers.",
      "By day a wealthy billionaire industrialist, by night striking terror into villainous hearts.",
      "Operates out of a subterranean cavern command center, assisted by his loyal butler Alfred.",
      "Equips himself with tactical armor, a bat-themed emblem, specialized gadgets, and a sleek car.",
    ],
  },
  {
    id: "culture-3",
    category: "culture",
    civilianWord: "Harry Potter",
    undercoverWord: "Percy Jackson",
    civilianClues: [
      "The boy wizard who learned of his magical heritage upon receiving an owl letter at age eleven.",
      "Bears a legendary lightning-bolt-shaped scar on his forehead from surviving the Dark Lord.",
      "Attends a Scottish boarding castle of witchcraft, sorted into the brave scarlet Gryffindor house.",
      "Catches the golden snitch during high-speed flying broomstick quidditch matches.",
    ],
    undercoverClues: [
      "A modern high-schooler who discovers he is the mythological demigod son of Poseidon.",
      "Spends summers training at a secret Long Island camp alongside satyrs and mythological heroes.",
      "Commands water currents, breathes underwater, and wields a pen that transforms into a sword.",
      "Embarks on quests across modern America facing mythical Greek monsters and Olympian deities.",
    ],
  },
  {
    id: "culture-4",
    category: "culture",
    civilianWord: "Vampire",
    undercoverWord: "Werewolf",
    civilianClues: [
      "An immortal nocturnal gothic monster of European myth that subsists on human blood.",
      "Casts no reflection in glass mirrors and suffers fatal burns when touched by direct sunlight.",
      "Tradition holds they can be repelled with pungent garlic cloves, wooden stakes, and holy relics.",
      "Often portrayed in velvet capes inside Transylvanian castles, shapeshifting into flying bats.",
    ],
    undercoverClues: [
      "A cursed human who involuntarily transforms into a ravenous canine beast under a full moon.",
      "Endowed with fearsome physical strength, razor claws, and a chilling mournful midnight howl.",
      "Folklore insists that their only true mortal vulnerability is being shot with silver ammunition.",
      "Struggles with tragic loss of humanity while roaming through shadowy forests in primal packs.",
    ],
  },
  {
    id: "culture-5",
    category: "culture",
    civilianWord: "Magician",
    undercoverWord: "Hypnotist",
    civilianClues: [
      "An entertainer who performs illusions and sleight of hand to astonish audiences.",
      "Known for pulling white rabbits from silk top hats, sawing assistants in half, and shuffling cards.",
      "Never reveals the secret methods behind their baffling parlor tricks and stage deceptions.",
      "Wears black stage tuxedos and gestures dramatically with a slender tip wand.",
    ],
    undercoverClues: [
      "A practitioner who guides subjects into a relaxed, highly suggestible trance state.",
      "Often utilizes a swinging pocket watch or rhythmic soothing cadence to induce focus.",
      "Performs comedic stage demonstrations or clinical therapy sessions to break habits.",
      "Instructs volunteers to act out humorous suggestions before snapping fingers to awaken them.",
    ],
  },

  // Daily Life
  {
    id: "daily-1",
    category: "daily",
    civilianWord: "Elevator",
    undercoverWord: "Escalator",
    civilianClues: [
      "A vertical passenger car hoisted by cables and counterweights inside a building shaft.",
      "Transports office workers and residents swiftly between skyscraper stories.",
      "Equipped with interior button panels, floor indicator chimes, and emergency telephone alarms.",
      "Experiences packed queues in corporate lobby hallways during early morning rush hours.",
    ],
    undercoverClues: [
      "A motorized moving flight of metal steps that carries pedestrians between adjacent floors.",
      "Equipped with grooved aluminum steps that cycle continuously alongside rubber handrails.",
      "Commonly found in bustling shopping malls, airport terminals, and transit stations.",
      "Etiquette encourages passengers to stand to one side and walk on the other.",
    ],
  },
  {
    id: "daily-2",
    category: "daily",
    civilianWord: "Umbrella",
    undercoverWord: "Raincoat",
    civilianClues: [
      "A collapsible canopy made of waterproof fabric supported by hinged metal ribs on a handle.",
      "Carried by hand and pushed open overhead to shield against sudden rainfall or bright sunshine.",
      "Frequently forgotten and left behind on buses, subways, or entryway stands.",
      "Can flip inside-out unexpectedly when caught in powerful crosswinds during stormy downpours.",
    ],
    undercoverClues: [
      "A waterproof wearable jacket with a hood tailored to keep clothing dry in wet weather.",
      "Fastened with buttons, zippers, or drawstrings, freeing both hands for carrying bags or cycling.",
      "Made from lightweight synthetic nylon, coated PVC, or breathable Gore-Tex membranes.",
      "Bright yellow versions are a classic protective choice for toddlers, fishermen, and mariners.",
    ],
  },
  {
    id: "daily-3",
    category: "daily",
    civilianWord: "Roller Coaster",
    undercoverWord: "Ferris Wheel",
    civilianClues: [
      "An amusement park thrill ride featuring passenger cars racing along twisting steel tracks.",
      "Delivers heart-pounding acceleration with steep gravitational drops, corkscrews, and upside-down loops.",
      "Riders are strapped into secure overhead harness bars while shouting and screaming in delight.",
      "Ratchets slowly up a towering motorized lift hill before plunging downward at breakneck velocity.",
    ],
    undercoverClues: [
      "A colossal revolving upright steel observation wheel carrying enclosed passenger cabins.",
      "Rotates at a slow, gentle pace to provide breathtaking panoramic city and harbor skylines.",
      "Often illuminated by vibrant computerized neon light displays, forming a waterfront landmark.",
      "A beloved romantic attraction for couples and sightseers seeking a relaxed scenic spin.",
    ],
  },
  {
    id: "daily-4",
    category: "daily",
    civilianWord: "Sunglasses",
    undercoverWord: "Goggles",
    civilianClues: [
      "Protective eyewear fitted with dark tinted or polarized lenses to shield eyes from harsh glare.",
      "A stylish fashion accessory worn during sunny beach vacations, scenic drives, and summer walks.",
      "Rests gently across the bridge of the nose with side temples tucked over both ears.",
      "Shields delicate eye tissues from harmful ultraviolet solar rays while outdoors.",
    ],
    undercoverClues: [
      "Tight-fitting protective eyewear equipped with soft rubber suction gaskets around the eye sockets.",
      "Secured around the back of the head with an adjustable elastic strap for underwater swimming or skiing.",
      "Treated with anti-fog coatings to keep vision transparent under water or amid heavy snow.",
      "Prevents stinging pool chlorine, ocean saltwater, or flying chemical splashes from hurting the eyes.",
    ],
  },
  {
    id: "daily-5",
    category: "daily",
    civilianWord: "Parachute",
    undercoverWord: "Parasol",
    civilianClues: [
      "A large hemispherical fabric canopy that decelerates the descent of a falling object or person.",
      "Deployed during skydiving excursions, military airborne drops, or spacecraft capsule landings.",
      "Steered by pulling dual steering toggles to maneuver flight direction toward a target landing zone.",
      "Requires meticulous, disciplined folding into a backpack rig, as personal safety depends on it.",
    ],
    undercoverClues: [
      "A decorative lightweight handheld canopy used primarily to shield the face from bright sunshine.",
      "Often crafted from delicate paper, lace, or UV-blocking silk with an ornate wooden handle.",
      "Traditionally carried as a graceful fashion accessory during sunny garden tea parties.",
      "Differs from storm umbrellas because it is not intended for heavy wind or torrential rain.",
    ],
  },
];

/**
 * Returns the curated word bank corresponding to the given locale (default: zh-CN).
 */
function wordLocale(raw?: string): "en" | "zh-CN" | "zh-TW" | keyof typeof translatedWords {
 const lang = (raw || "en").toLowerCase();
 if (/^zh-(tw|hk|mo|hant)(-|$)/.test(lang)) return "zh-TW";
 if (lang === "zh" || lang.startsWith("zh-")) return "zh-CN";
 const base = lang.split("-")[0];
 return base === "ja" || base === "ko" || base === "es" || base === "de" || base === "fr" ? base : "en";
}
export function getWordPairsForLocale(locale?: string): WordPair[] {
 const lang = wordLocale(locale);
 if (lang === "en") return WORD_PAIRS_EN;
 if (lang === "zh-TW") return WORD_PAIRS_ZHTW;
 if (lang === "zh-CN") return WORD_PAIRS;
 return translatedWords[lang] as WordPair[];
}

/**
 * Helper to select a word pair respecting the current locale.
 */
export function selectWordPair(
  category: WordCategory,
  roundSeed: number,
  customCivilian?: string | null,
  customUndercover?: string | null,
  locale?: string,
): WordPair {
  const loc = wordLocale(locale);
  const isEn = loc === "en";
  const isTw = loc === "zh-TW";

  if (
    category === "custom" &&
    customCivilian &&
    customCivilian.trim() &&
    customUndercover &&
    customUndercover.trim()
  ) {
    const civ = customCivilian.trim();
    const und = customUndercover.trim();

    const civilianClues = isEn
      ? [
          `An everyday concept familiar to all of us, consisting of ${civ.length} characters.`,
          "A tangible and distinct mental picture comes to mind when you picture it.",
          "Very recognizable within its category, often encountered in daily conversations.",
          "Its core attributes are prominent, with subtle nuances compared to related terms.",
          "Listening to prior clues, my description leans toward the mainstream scenario.",
        ]
      : isTw
      ? [
          `日常生活中大家都很熟悉的事物，一共 ${civ.length} 個字`,
          "提到它的時候，大家腦海裡會有很具體的畫面感",
          "在同類東西裡辨識度很高，平時經常會接觸或聊到",
          "它的核心特點很鮮明，但細節上跟相近概念略有區別",
          "注意聽前幾位描述的使用場景，我這個更偏向主流常見款",
        ]
      : [
          `日常生活中大家都很熟悉的事物，一共 ${civ.length} 个字`,
          "提到它的时候，大家脑海里会有很具体的画面感",
          "在同类东西里辨识度很高，平时经常会接触或聊到",
          "它的核心特点很鲜明，但细节上跟相近概念略有区别",
          "注意听前几位描述的使用场景，我这个更偏向主流常见款",
        ];

    const undercoverClues = isEn
      ? [
          `A widely recognized concept we frequently encounter, spelled with ${und.length} characters.`,
          "Tied closely to life experiences with its own unique use cases.",
          "Its functionality is prominent and indispensable in specific scenarios.",
          "Hearing everyone's clues, the broad direction aligns, but details feel intriguing.",
          "My concept has distinct features; I will share subtle clues to test the waters.",
        ]
      : isTw
      ? [
          `平時經常能聽到或見到的概念，字數是 ${und.length} 個字`,
          "和生活體驗息息相關，有自己獨特的使用場景",
          "功能屬性很明確，在特定場合下幾乎不可或缺",
          "聽大家的描述感覺大方向很接近，但側重點似乎有一點微妙差異",
          "我手裡的這份特徵很典型，先穩一手看看風向",
        ]
      : [
          `平时经常能听到或见到的概念，字数是 ${und.length} 个字`,
          "和生活体验息息相关，有自己独特的使用场景",
          "功能属性很明确，在特定场合下几乎不可或缺",
          "听大家的描述感觉大方向很接近，但侧重点似乎有一点微妙差异",
          "我手里的这个特征很典型，先稳一手看看风向",
        ];

    return {
      id: `custom-${roundSeed}${["ja", "ko", "es", "de", "fr"].includes(loc) ? "-" + loc : ""}`,
      category: "daily",
      civilianWord: civ,
      undercoverWord: und,
      civilianClues: loc === "en" || loc === "zh-CN" || loc === "zh-TW" ? civilianClues : extra[loc].customClues.slice(0, 5).map(clue => clue.replace(/\{count\}/g, String(civ.length))),
      undercoverClues: loc === "en" || loc === "zh-CN" || loc === "zh-TW" ? undercoverClues : extra[loc].customClues.slice(5).map(clue => clue.replace(/\{count\}/g, String(und.length))),
    };
  }

  const baseList = getWordPairsForLocale(locale);
  const pool =
    category === "all" || category === "custom"
      ? baseList
      : baseList.filter((w) => w.category === category);

  const list = pool.length > 0 ? pool : baseList;
  const idx = Math.floor(Math.random() * list.length);
  const chosen = list[idx] || list[0];

  // Randomly swap civilian and undercover 50% of the time so even familiar pairs stay fresh!
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
