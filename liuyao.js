/**
 * liuyao.js — 六爻纳甲完整算法
 *
 * 核心数据：六十四卦、八宫归属、纳甲地支、六亲、世应、干支历法
 */

// ─────────────────────────────────────────────
// 基础数据
// ─────────────────────────────────────────────

const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DIZHI   = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const WUXING_TG = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']; // 天干五行
const WUXING_DZ = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水']; // 地支五行
const JIAZI60 = [];
for (let i = 0; i < 60; i++) {
  JIAZI60.push(TIANGAN[i % 10] + DIZHI[i % 12]);
}

// 旬首（每旬第一个甲子）对应空亡地支
const XUNKONG_MAP = {
  '甲子': ['戌', '亥'],
  '甲戌': ['申', '酉'],
  '甲申': ['午', '未'],
  '甲午': ['辰', '巳'],
  '甲辰': ['寅', '卯'],
  '甲寅': ['子', '丑'],
};

// 月建（寅月为正月，依次类推）
const MONTH_DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

// 时辰地支
const HOUR_DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ─────────────────────────────────────────────
// 八宫卦及纳甲数据
// 八宫：乾、兑、离、震、巽、坎、艮、坤
// 每宫8卦：本宫卦、一世、二世、三世、四世、五世、游魂、归魂
// ─────────────────────────────────────────────

// 六爻纳甲地支（每宫每爻固定，从初爻到上爻）
// 格式：[宫名, 阳爻纳甲六支, 阴爻纳甲六支]
// 实际上纳甲按照卦宫和阴阳爻位来定
// 以下直接存储64卦完整信息

/**
 * 八纯卦地支表（每个三爻卦对应的三个地支，按初→二→三爻顺序）
 * 来源：用户提供的标准数据
 */
// 八纯卦完整地支序列（初爻→上爻，索引0=初爻，5=上爻）
// 下卦取[0..2]，上卦取[3..5]
const TRIGRAM_DIZHI = {
  '乾': ['子', '寅', '辰', '午', '申', '戌'],
  '兑': ['巳', '卯', '丑', '亥', '酉', '未'],
  '离': ['卯', '丑', '亥', '酉', '未', '巳'],
  '震': ['子', '寅', '辰', '午', '申', '戌'],
  '巽': ['丑', '亥', '酉', '未', '巳', '卯'],
  '坎': ['寅', '辰', '午', '申', '戌', '子'],
  '艮': ['辰', '午', '申', '戌', '子', '寅'],
  '坤': ['未', '巳', '卯', '丑', '亥', '酉'],
};

/** 根据三爻数组（从初→三）识别卦名 */
function linesTo8Gua(l) {
  return ({
    '111':'乾','110':'兑','101':'离','100':'震',
    '011':'巽','010':'坎','001':'艮','000':'坤',
  })[l.join('')] || '乾';
}

/**
 * 64卦世应固定表（来源：传统六爻纳甲典籍）
 * 键：卦名，值：{ shi: 世爻位置(1-6,1=初爻), ying: 应爻位置 }
 * 此表不推导，直接查表获得
 */
const HEXAGRAM_SHI_YING_MAP = {
  // ─── 乾宫 ───
  '乾为天':   { shi:6, ying:3 },
  '天风姤':   { shi:1, ying:4 },
  '天山遁':   { shi:2, ying:5 },
  '天地否':   { shi:3, ying:6 },
  '风地观':   { shi:4, ying:1 },
  '山地剥':   { shi:5, ying:2 },
  '火地晋':   { shi:4, ying:1 },
  '火天大有': { shi:3, ying:6 },
  // ─── 坤宫 ───
  '坤为地':   { shi:6, ying:3 },
  '地雷复':   { shi:1, ying:4 },
  '地泽临':   { shi:2, ying:5 },
  '地天泰':   { shi:3, ying:6 },
  '雷天大壮': { shi:4, ying:1 },
  '泽天夬':   { shi:5, ying:2 },
  '水天需':   { shi:4, ying:1 },
  '水地比':   { shi:3, ying:6 },
  // ─── 震宫 ───
  '震为雷':   { shi:6, ying:3 },
  '雷地豫':   { shi:1, ying:4 },
  '雷水解':   { shi:2, ying:5 },
  '雷风恒':   { shi:3, ying:6 },
  '地风升':   { shi:4, ying:1 },
  '水风井':   { shi:5, ying:2 },
  '泽风大过': { shi:4, ying:1 },
  '泽雷随':   { shi:3, ying:6 },
  // ─── 巽宫 ───
  '巽为风':   { shi:6, ying:3 },
  '风天小畜': { shi:1, ying:4 },
  '风火家人': { shi:2, ying:5 },
  '风雷益':   { shi:3, ying:6 },
  '天雷无妄': { shi:4, ying:1 },
  '火雷噬嗑': { shi:5, ying:2 },
  '山雷颐':   { shi:4, ying:1 },
  '山风蛊':   { shi:3, ying:6 },
  // ─── 坎宫 ───
  '坎为水':   { shi:6, ying:3 },
  '水泽节':   { shi:1, ying:4 },
  '水雷屯':   { shi:2, ying:5 },
  '水火既济': { shi:3, ying:6 },
  '泽火革':   { shi:4, ying:1 },
  '雷火丰':   { shi:5, ying:2 },
  '地火明夷': { shi:4, ying:1 },
  '地水师':   { shi:3, ying:6 },
  // ─── 离宫 ───
  '离为火':   { shi:6, ying:3 },
  '火山旅':   { shi:1, ying:4 },
  '火风鼎':   { shi:2, ying:5 },
  '火水未济': { shi:3, ying:6 },
  '山水蒙':   { shi:4, ying:1 },
  '风水涣':   { shi:5, ying:2 },
  '天水讼':   { shi:4, ying:1 },
  '天火同人': { shi:3, ying:6 },
  // ─── 艮宫 ───
  '艮为山':   { shi:6, ying:3 },
  '山火贲':   { shi:1, ying:4 },
  '山天大畜': { shi:2, ying:5 },
  '山泽损':   { shi:3, ying:6 },
  '火泽睽':   { shi:4, ying:1 },
  '天泽履':   { shi:5, ying:2 },
  '风泽中孚': { shi:4, ying:1 },
  '风山渐':   { shi:3, ying:6 },
  // ─── 兑宫 ───
  '兑为泽':   { shi:6, ying:3 },
  '泽水困':   { shi:1, ying:4 },
  '泽地萃':   { shi:2, ying:5 },
  '泽山咸':   { shi:3, ying:6 },
  '水山蹇':   { shi:4, ying:1 },
  '地山谦':   { shi:5, ying:2 },
  '雷山小过': { shi:4, ying:1 },
  '雷泽归妹': { shi:3, ying:6 },
};

/**
 * 64卦完整数据
 * lines: 6位二进制字符串，'1'=阳爻，'0'=阴爻，从初爻(右)到上爻(左)
 * 但我们存为数组 [初爻, 二爻, 三爻, 四爻, 五爻, 上爻]，1=阳0=阴
 * gong: 所属八宫
 * shi/ying: 通过 HEXAGRAM_SHI_YING_MAP 查表获得
 */
const HEXAGRAMS = {
  // ─── 乾宫 ───
  '乾为天':     { lines:[1,1,1,1,1,1], gong:'乾' },
  '天风姤':     { lines:[0,1,1,1,1,1], gong:'乾' },
  '天山遁':     { lines:[0,0,1,1,1,1], gong:'乾' },
  '天地否':     { lines:[0,0,0,1,1,1], gong:'乾' },
  '风地观':     { lines:[0,0,0,0,1,1], gong:'乾' },
  '山地剥':     { lines:[0,0,0,0,0,1], gong:'乾' },
  '火地晋':     { lines:[0,0,0,1,0,1], gong:'乾' },
  '火天大有':   { lines:[1,1,1,1,0,1], gong:'乾' },

  // ─── 坤宫 ───
  '坤为地':     { lines:[0,0,0,0,0,0], gong:'坤' },
  '地雷复':     { lines:[1,0,0,0,0,0], gong:'坤' },
  '地泽临':     { lines:[1,1,0,0,0,0], gong:'坤' },
  '地天泰':     { lines:[1,1,1,0,0,0], gong:'坤' },
  '雷天大壮':   { lines:[1,1,1,1,0,0], gong:'坤' },
  '泽天夬':     { lines:[1,1,1,1,1,0], gong:'坤' },
  '水天需':     { lines:[1,1,1,0,1,0], gong:'坤' },
  '水地比':     { lines:[0,0,0,0,1,0], gong:'坤' },

  // ─── 震宫 ───
  '震为雷':     { lines:[1,0,0,1,0,0], gong:'震' },
  '雷地豫':     { lines:[0,0,0,1,0,0], gong:'震' },
  '雷水解':     { lines:[0,1,0,1,0,0], gong:'震' },
  '雷风恒':     { lines:[0,1,1,1,0,0], gong:'震' },
  '地风升':     { lines:[0,1,1,0,0,0], gong:'震' },
  '水风井':     { lines:[0,1,1,0,1,0], gong:'震' },
  '泽风大过':   { lines:[0,1,1,1,1,0], gong:'震' },
  '泽雷随':     { lines:[1,0,0,1,1,0], gong:'震' },

  // ─── 巽宫 ───
  '巽为风':     { lines:[0,1,1,0,1,1], gong:'巽' },
  '风天小畜':   { lines:[1,1,1,0,1,1], gong:'巽' },
  '风火家人':   { lines:[1,0,1,0,1,1], gong:'巽' },
  '风雷益':     { lines:[1,0,0,0,1,1], gong:'巽' },
  '天雷无妄':   { lines:[1,0,0,1,1,1], gong:'巽' },
  '火雷噬嗑':   { lines:[1,0,0,1,0,1], gong:'巽' },
  '山雷颐':     { lines:[1,0,0,0,0,1], gong:'巽' },
  '山风蛊':     { lines:[0,1,1,0,0,1], gong:'巽' },

  // ─── 坎宫 ───
  '坎为水':     { lines:[0,1,0,0,1,0], gong:'坎' },
  '水泽节':     { lines:[1,1,0,0,1,0], gong:'坎' },
  '水雷屯':     { lines:[1,0,0,0,1,0], gong:'坎' },
  '水火既济':   { lines:[1,0,1,0,1,0], gong:'坎' },
  '泽火革':     { lines:[1,0,1,1,1,0], gong:'坎' },
  '雷火丰':     { lines:[1,0,1,1,0,0], gong:'坎' },
  '地火明夷':   { lines:[1,0,1,0,0,0], gong:'坎' },
  '地水师':     { lines:[0,1,0,0,0,0], gong:'坎' },

  // ─── 离宫 ───
  '离为火':     { lines:[1,0,1,1,0,1], gong:'离' },
  '火山旅':     { lines:[0,0,1,1,0,1], gong:'离' },
  '火风鼎':     { lines:[0,1,1,1,0,1], gong:'离' },
  '火水未济':   { lines:[0,1,0,1,0,1], gong:'离' },
  '山水蒙':     { lines:[0,1,0,0,0,1], gong:'离' },
  '风水涣':     { lines:[0,1,0,0,1,1], gong:'离' },
  '天水讼':     { lines:[0,1,0,1,1,1], gong:'离' },
  '天火同人':   { lines:[1,0,1,1,1,1], gong:'离' },

  // ─── 艮宫 ───
  '艮为山':     { lines:[0,0,1,0,0,1], gong:'艮' },
  '山火贲':     { lines:[1,0,1,0,0,1], gong:'艮' },
  '山天大畜':   { lines:[1,1,1,0,0,1], gong:'艮' },
  '山泽损':     { lines:[1,1,0,0,0,1], gong:'艮' },
  '火泽睽':     { lines:[1,1,0,1,0,1], gong:'艮' },
  '天泽履':     { lines:[1,1,0,1,1,1], gong:'艮' },
  '风泽中孚':   { lines:[1,1,0,0,1,1], gong:'艮' },
  '风山渐':     { lines:[0,0,1,0,1,1], gong:'艮' },

  // ─── 兑宫 ───
  '兑为泽':     { lines:[1,1,0,1,1,0], gong:'兑' },
  '泽水困':     { lines:[0,1,0,1,1,0], gong:'兑' },
  '泽地萃':     { lines:[0,0,0,1,1,0], gong:'兑' },
  '泽山咸':     { lines:[0,0,1,1,1,0], gong:'兑' },
  '水山蹇':     { lines:[0,0,1,0,1,0], gong:'兑' },
  '地山谦':     { lines:[0,0,1,0,0,0], gong:'兑' },
  '雷山小过':   { lines:[0,0,1,1,0,0], gong:'兑' },
  '雷泽归妹':   { lines:[1,1,0,1,0,0], gong:'兑' },
};

// ─────────────────────────────────────────────
// 六亲生克关系
// 我克者为妻财，克我者为官鬼，生我者为父母，我生者为子孙，比和者为兄弟
// ─────────────────────────────────────────────
const WUXING_ORDER = ['木', '火', '土', '金', '水'];

function wuxingSheng(a) {
  // a生的五行
  const map = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  return map[a];
}
function wuxingKe(a) {
  // a克的五行
  const map = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  return map[a];
}

/**
 * 以"卦宫五行"为基准判断六亲（按用户逻辑）
 * @param {string} gongWuxing 卦宫五行（我=P）
 * @param {string} yaoWuxing  爻五行=B
 */
function getLiuqin(gongWuxing, yaoWuxing) {
  // B生P → 父母
  if (wuxingSheng(yaoWuxing) === gongWuxing)   return '父母';
  // P克B → 妻财
  if (wuxingKe(gongWuxing)    === yaoWuxing)   return '妻财';
  // P生B → 子孙
  if (wuxingSheng(gongWuxing) === yaoWuxing)   return '子孙';
  // B克P → 官鬼
  if (wuxingKe(yaoWuxing)    === gongWuxing)   return '官鬼';
  // B与P相同 → 兄弟
  if (gongWuxing === yaoWuxing)                return '兄弟';
  return '兄弟';
}

/**
 * 从日柱干支（如"庚申"）提取日干五行
 */
function getDayGanWuxing(dayGanzhi) {
  const idx = TIANGAN.indexOf(dayGanzhi.charAt(0));
  return idx >= 0 ? WUXING_TG[idx] : '土';
}

// ─────────────────────────────────────────────
// 六神排布（根据日干确定起点）
// ─────────────────────────────────────────────

const SIX_SPIRITS = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];

const SPIRIT_START_MAP = {
  '甲': '青龙', '乙': '青龙',
  '丙': '朱雀', '丁': '朱雀',
  '戊': '勾陈',
  '己': '腾蛇',
  '庚': '白虎', '辛': '白虎',
  '壬': '玄武', '癸': '玄武',
};

function getSixSpirits(dayGan) {
  const startSpirit = SPIRIT_START_MAP[dayGan] || '青龙';
  const startIdx = SIX_SPIRITS.indexOf(startSpirit);
  const spirits = [];
  for (let i = 0; i < 6; i++) {
    spirits.push(SIX_SPIRITS[(startIdx + i) % 6]);
  }
  return spirits;
}

// 八宫主卦五行
const GONG_WUXING = {
  '乾': '金', '兑': '金',
  '离': '火', '震': '木', '巽': '木',
  '坎': '水', '艮': '土', '坤': '土',
};

// ─────────────────────────────────────────────
// 干支历法（使用 lunar-javascript 库精确计算）
// ─────────────────────────────────────────────

/**
 * 计算旬空（根据日柱干支）
 */
function getXunkong(dayGanzhi) {
  const idx = JIAZI60.indexOf(dayGanzhi);
  if (idx === -1) return [];
  const xunStart = Math.floor(idx / 10) * 10;
  const xunShou = JIAZI60[xunStart];
  return XUNKONG_MAP[xunShou] || [];
}

/**
 * 获取当前时间干支信息（通过 lunar-javascript 精确计算，含节气月建）
 */
function getCurrentGanzhi(date) {
  const y   = date.getFullYear();
  const m   = date.getMonth() + 1;
  const d   = date.getDate();
  const h   = date.getHours();
  const min = date.getMinutes();

  // 使用 lunar-javascript 获取精确四柱（按节气月建）
  const solar = Solar.fromYmdHms(y, m, d, h, min, 0);
  const ec    = solar.getLunar().getEightChar();

  const yearGZ  = ec.getYear();
  const monthGZ = ec.getMonth();
  const dayGZ   = ec.getDay();
  const hourGZ  = ec.getTime();
  const xunkong = getXunkong(dayGZ);

  return {
    year:  yearGZ,
    month: monthGZ,
    day:   dayGZ,
    hour:  hourGZ,
    xunkong,
    // 公历实际时间
    actualYear:  y,
    actualMonth: m,
    actualDay:   d,
    actualHour:  h,
    actualMin:   min,
  };
}

// ─────────────────────────────────────────────
// 掷铜钱起卦
// ─────────────────────────────────────────────

/**
 * 掷3枚铜钱
 * coins[i]: true = 字面(正面), false = 背面(素面)
 * 计分规则：字面=2，背面=3（与参考实现一致）
 *   三字(heads=3) = 2+2+2 = 6 = 老阴(×，动爻变阳)
 *   两字一背(heads=2) = 2+2+3 = 7... 实际按字数映射：
 *     heads=3 → 6(老阴), heads=2 → 8(少阴), heads=1 → 7(少阳), heads=0 → 9(老阳)
 */
function throwThreeCoins() {
  const coins = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5];
  const heads = coins.filter(Boolean).length; // 字面数量
  // 字面=2(阴)，背面=3(阳)
  // 3背0字: 3+3+3=9 老阳○ 动爻变阴
  // 2背1字: 3+3+2=8 少阴-- 静爻
  // 1背2字: 3+2+2=7 少阳—  静爻
  // 0背3字: 2+2+2=6 老阴×  动爻变阳
  let value;
  if      (heads === 0) value = 9; // 三背  = 老阳 ○ 动爻
  else if (heads === 1) value = 8; // 一字二背 = 少阴 -- 静
  else if (heads === 2) value = 7; // 二字一背 = 少阳 — 静
  else                  value = 6; // 三字  = 老阴 × 动爻
  return { coins, value };
}

/**
 * 爻值 → 爻属性
 * 6=老阴(×，变阳), 7=少阳(—，静), 8=少阴(--，静), 9=老阳(○，变阴)
 */
function valueToYao(value) {
  switch (value) {
    case 6: return { line: 0, moving: true,  symbol: '×',  name: '老阴' };
    case 7: return { line: 1, moving: false, symbol: '—',  name: '少阳' };
    case 8: return { line: 0, moving: false, symbol: '--', name: '少阴' };
    case 9: return { line: 1, moving: true,  symbol: '○',  name: '老阳' };
    default: return { line: 1, moving: false, symbol: '—', name: '少阳' };
  }
}

/**
 * 起卦：掷6次铜钱，从初爻到上爻
 * 返回 throws[0..5]，索引0=初爻，5=上爻
 */
function castHexagram() {
  const throws = [];
  for (let i = 0; i < 6; i++) {
    const { coins, value } = throwThreeCoins();
    throws.push({ coins, value, ...valueToYao(value) });
  }
  return throws;
}

// ─────────────────────────────────────────────
// 查卦
// ─────────────────────────────────────────────

/**
 * 根据六爻线型（0/1数组，初→上）找卦名
 */
function findHexagramByLines(lines) {
  for (const [name, data] of Object.entries(HEXAGRAMS)) {
    if (data.lines.every((v, i) => v === lines[i])) {
      const shiYing = HEXAGRAM_SHI_YING_MAP[name] || { shi: 6, ying: 3 };
      return { name, ...data, ...shiYing };
    }
  }
  const shiYing = HEXAGRAM_SHI_YING_MAP['乾为天'] || { shi: 6, ying: 3 };
  return { name: '乾为天', ...HEXAGRAMS['乾为天'], ...shiYing };
}

/**
 * 计算变卦（将动爻变性）
 */
function getBiankua(lines, throws) {
  const hasMoving = throws.some(t => t.moving);
  if (!hasMoving) return null;

  const newLines = lines.map((l, i) => (throws[i].moving ? 1 - l : l));
  return findHexagramByLines(newLines);
}

/**
 * 计算每爻的纳甲地支（按用户逻辑：下卦地支+上卦地支）
 * @param {number[]} lines  六爻数组 [初,二,三,四,五,上]，1=阳 0=阴
 * @param {number}   yaoIdx 爻位索引 0=初爻 … 5=上爻
 */
function getYaoDizhi(lines, yaoIdx) {
  if (yaoIdx < 3) {
    const trigram = linesTo8Gua(lines.slice(0, 3));
    return TRIGRAM_DIZHI[trigram][yaoIdx];       // 下卦用索引 0-2
  } else {
    const trigram = linesTo8Gua(lines.slice(3, 6));
    return TRIGRAM_DIZHI[trigram][yaoIdx];       // 上卦用索引 3-5
  }
}

/**
 * 完整起卦并计算所有信息
 */
function liuyaoQigua(date) {
  const ganzhi  = getCurrentGanzhi(date || new Date());
  const throws  = castHexagram();
  const lines   = throws.map(t => t.line);
  const benkua  = findHexagramByLines(lines);
  const biankua = getBiankua(lines, throws);

  const dayGan  = ganzhi.day.charAt(0);
  const dayWx   = getDayGanWuxing(dayGan);
  const spirits = getSixSpirits(dayGan);

  // 计算本卦六爻详细信息
  const yaos = throws.map((t, i) => {
    const dizhi  = getYaoDizhi(lines, i);
    const wuxing = WUXING_DZ[DIZHI.indexOf(dizhi)];
    const gongWuxing = GONG_WUXING[benkua.gong];
    const liuqin = getLiuqin(gongWuxing, wuxing);
    const shi    = (i + 1) === benkua.shi;
    const ying   = (i + 1) === benkua.ying;
    return {
      yaoIdx: i + 1,
      dizhi,
      wuxing,
      liuqin,
      spirit: spirits[i],
      shi,
      ying,
      line:    t.line,
      moving:  t.moving,
      value:   t.value,
      coins:   t.coins,
      symbol:  t.symbol,
    };
  });

  // 计算变卦六爻详细信息
  // 规则：动爻变卦后，六亲仍按主卦宫定
  let biankuaYaos = null;
  if (biankua) {
    const bianLines  = lines.map((l, i) => (throws[i].moving ? 1 - l : l));
    biankuaYaos = bianLines.map((line, i) => {
      const dizhi  = getYaoDizhi(bianLines, i);
      const wuxing = WUXING_DZ[DIZHI.indexOf(dizhi)];
      const gongWuxing = GONG_WUXING[benkua.gong]; // 六亲仍用主卦宫
      const liuqin = getLiuqin(gongWuxing, wuxing);
      const shi    = (i + 1) === biankua.shi;
      const ying   = (i + 1) === biankua.ying;
      return {
        yaoIdx: i + 1,
        dizhi,
        wuxing,
        liuqin,
        spirit: spirits[i],
        shi,
        ying,
        line,
        moving: false,
      };
    });
  }

  return { ganzhi, benkua, biankua, yaos, biankuaYaos, throws };
}

// ─────────────────────────────────────────────
// 导出
// ─────────────────────────────────────────────
window.Liuyao = {
  liuyaoQigua,
  castHexagram,
  throwThreeCoins,
  getCurrentGanzhi,
  getSixSpirits,
  getXunkong,
  HEXAGRAMS,
  HEXAGRAM_SHI_YING_MAP,
  DIZHI,
  WUXING_DZ,
  GONG_WUXING,
  SIX_SPIRITS,
  SPIRIT_START_MAP,
};
