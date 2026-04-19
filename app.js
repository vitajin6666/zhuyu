/**
 * app.js — 竹语主应用逻辑
 */

// ─── 状态 ───
let currentResult        = null;
let isAnimating          = false;
let conversationHistory  = []; // [{role, content}] 追问历史
let isAiThinking         = false;

// ─── DOM 引用 ───
const questionInput   = document.getElementById('question-input');
const startBtn        = document.getElementById('start-btn');
const restartBtn      = document.getElementById('restart-btn');
const interpretBtn    = document.getElementById('interpret-btn');

// coins-section 内部元素
const throwNumEl      = document.getElementById('throw-num');
const throwYaoNameEl  = document.getElementById('throw-yao-name');
const coinsRow        = document.getElementById('coins-row');
const throwsLog       = document.getElementById('throws-log');
const nextThrowBtn    = document.getElementById('next-throw-btn');
const viewHexagramBtn = document.getElementById('view-hexagram-btn');

// ─── 屏幕切换 ───

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    if (s.id === id) {
      s.classList.remove('screen-past');
      s.classList.add('screen-active');
    } else if (s.classList.contains('screen-active')) {
      s.classList.remove('screen-active');
      s.classList.add('screen-past');
    }
  });
}

// ─── 起卦流程 ───

startBtn.addEventListener('click', async () => {
  const question = questionInput.value.trim();
  if (!question) {
    questionInput.classList.add('shake');
    setTimeout(() => questionInput.classList.remove('shake'), 500);
    questionInput.placeholder = '请先输入你的问题…';
    return;
  }
  if (isAnimating) return;

  isAnimating = true;
  startBtn.disabled = true;

  // 重置摇卦区
  throwsLog.innerHTML = '';
  nextThrowBtn.classList.add('hidden');
  viewHexagramBtn.classList.add('hidden');

  // 切换到摇卦屏
  showScreen('screen-coins');

  const result = Liuyao.liuyaoQigua(new Date());
  currentResult = { question, ...result };

  const posNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

  for (let i = 0; i < 6; i++) {
    throwNumEl.textContent     = i + 1;
    throwYaoNameEl.textContent = posNames[i];

    await animateThrow(i, result.throws[i]);
    appendThrowLog(i, result.throws[i]);

    if (i < 5) {
      nextThrowBtn.textContent = `摇第 ${i + 2} 卦（${posNames[i + 1]}）`;
      nextThrowBtn.classList.remove('hidden');
      await waitForButton(nextThrowBtn);
      nextThrowBtn.classList.add('hidden');
    } else {
      viewHexagramBtn.classList.remove('hidden');
      await waitForButton(viewHexagramBtn);
      viewHexagramBtn.classList.add('hidden');
    }
  }

  // 渲染卦象后切换到结果屏
  renderHexagram(question, result);
  showScreen('screen-result');
  document.getElementById('result-scroll').scrollTop = 0;

  isAnimating = false;
  startBtn.disabled = false;
});

// ─── 重新起卦 ───

restartBtn.addEventListener('click', () => {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('screen-active', 'screen-past');
  });
  document.getElementById('screen-question').classList.add('screen-active');

  // 重置 AI 对话区
  aiMessages.innerHTML = '';
  conversationHistory = [];
  isAiThinking = false;
  aiSendBtn.disabled = false;
  aiFollowInput.value = '';
  aiChat.classList.add('hidden');
  interpretBtn.classList.remove('hidden');
  interpretBtn.textContent = '问竹（AI解卦）';
  interpretBtn.disabled = false;
});

// ─── 快捷提问选项 ───
document.querySelectorAll('.question-option').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.dataset.question || '';
    questionInput.value = text;
    questionInput.placeholder = '此刻心中有何困惑，想问卦象……';
    questionInput.classList.remove('shake');
    questionInput.focus();
    questionInput.setSelectionRange(text.length, text.length);
  });
});

// ─── 等待按钮点击 ───
function waitForButton(btn) {
  return new Promise(resolve => {
    btn.addEventListener('click', resolve, { once: true });
  });
}

// ─── 铜钱翻转动画 ───
const FLIP_DURATION = 850;

function buildCoin(isHeads) {
  const wrap = document.createElement('div');
  wrap.className = 'coin-wrap';
  const coin = document.createElement('div');
  coin.className = 'coin';
  const img = document.createElement('img');
  img.src  = isHeads ? 'coin-front.png' : 'coin-back.png';
  img.alt  = isHeads ? '字' : '背';
  img.className = 'coin-img';
  coin.appendChild(img);
  wrap.appendChild(coin);
  return { wrap, coin, img };
}

async function animateThrow(throwIndex, throwData) {
  coinsRow.innerHTML = '';
  const entries = [];

  throwData.coins.forEach(isHeads => {
    const { wrap, coin, img } = buildCoin(true);
    coinsRow.appendChild(wrap);
    entries.push({ coin, img, isHeads });
  });

  entries.forEach(({ coin }) => coin.classList.add('coin-flip'));

  await sleep(FLIP_DURATION * 0.5);
  entries.forEach(({ img, isHeads }) => {
    img.src = isHeads ? 'coin-front.png' : 'coin-back.png';
    img.alt = isHeads ? '字' : '背';
  });

  await sleep(FLIP_DURATION * 0.5 + 50);
  entries.forEach(({ coin }) => coin.classList.remove('coin-flip'));
}

function appendThrowLog(throwIndex, throwData) {
  const posNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
  const yaoMark = throwData.value === 9 ? '○'
    : throwData.value === 6 ? '×'
    : throwData.value === 7 ? '—' : '- -';
  const yaoLabel = throwData.value === 9 ? '老阳'
    : throwData.value === 6 ? '老阴'
    : throwData.value === 7 ? '少阳' : '少阴';

  const item = document.createElement('div');
  item.className = 'log-item' + (throwData.moving ? ' log-moving' : '');
  item.innerHTML = `
    <span class="log-pos">${posNames[throwIndex]}</span>
    <span class="log-yao">${yaoLabel}</span>
    <span class="log-mark">${yaoMark}</span>
  `;
  throwsLog.prepend(item);
}

// ─── 卦象渲染 ───

function renderHexagram(question, result) {
  const { ganzhi, benkua, biankua, yaos, biankuaYaos } = result;

  const mm  = String(ganzhi.actualMonth).padStart(2, '0');
  const dd  = String(ganzhi.actualDay).padStart(2, '0');
  const hh  = String(ganzhi.actualHour).padStart(2, '0');
  const min = String(ganzhi.actualMin).padStart(2, '0');
  document.getElementById('cast-time').textContent =
    `${ganzhi.actualYear}年${mm}月${dd}日　${hh}:${min}`;

  document.getElementById('gz-year').textContent    = ganzhi.year;
  document.getElementById('gz-month').textContent   = ganzhi.month;
  document.getElementById('gz-day').textContent     = ganzhi.day;
  document.getElementById('gz-hour').textContent    = ganzhi.hour;
  document.getElementById('gz-xunkong').textContent = ganzhi.xunkong.join('、') || '无';

  document.getElementById('benkua-name').textContent = benkua.name;
  document.getElementById('benkua-gong').textContent  = benkua.gong + '宫';
  document.getElementById('question-display').textContent = '所问：' + question;

  renderYaoTable('benkua-tbody', yaos, true);

  const biankuaCol = document.getElementById('biankua-col');
  const display    = document.getElementById('hexagram-display');
  if (biankua && biankuaYaos) {
    document.getElementById('biankua-name').textContent = biankua.name;
    document.getElementById('biankua-gong').textContent  = biankua.gong + '宫';
    renderYaoTable('biankua-tbody', biankuaYaos, false);
    biankuaCol.classList.remove('hidden');
    display.classList.add('has-bian');
  } else {
    biankuaCol.classList.add('hidden');
    display.classList.remove('has-bian');
  }

  interpretBtn.disabled = false;
  interpretBtn.textContent = '问竹（AI解卦）';
}

function renderYaoTable(tbodyId, yaos, showMoving) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';

  for (let i = 5; i >= 0; i--) {
    const y   = yaos[i];
    const row = document.createElement('tr');
    row.className = 'yao-row';
    if (showMoving && y.moving) row.classList.add('moving-yao');

    const movingMark = showMoving && y.moving
      ? `<span class="moving-mark">${y.value === 9 ? '○' : '×'}</span>` : '';
    const shiMark  = y.shi  ? '<span class="shi-mark">世</span>'  : '';
    const yingMark = y.ying ? '<span class="ying-mark">应</span>' : '';

    const yaoShape = y.line === 1
      ? '<div class="yao-bar yang-bar"></div>'
      : '<div class="yao-bar yin-bar"><span></span><span></span></div>';

    row.innerHTML = `
      <td class="yao-spirit">${y.spirit || ''}</td>
      <td class="yao-liuqin">${y.liuqin}</td>
      <td class="yao-dizhi">${y.dizhi}</td>
      <td class="yao-wuxing wuxing-${y.wuxing}">${y.wuxing}</td>
      <td class="yao-shape">${yaoShape}</td>
      <td class="yao-moving">${movingMark}</td>
      <td class="yao-marks">${shiMark}${yingMark}</td>
    `;

    row.style.animationDelay = `${(5 - i) * 0.12}s`;
    row.classList.add('yao-appear');
    tbody.appendChild(row);
  }
}

// ─── AI 解卦 ───

const aiChat       = document.getElementById('ai-chat');
const aiMessages   = document.getElementById('ai-messages');
const aiFollowInput = document.getElementById('ai-follow-input');
const aiSendBtn    = document.getElementById('ai-send-btn');

function getHexData() {
  return {
    ganzhi:  currentResult.ganzhi,
    benkua:  currentResult.benkua,
    biankua: currentResult.biankua,
    yaos:    currentResult.yaos,
  };
}

// 追加一条 AI 气泡，带加载动画，返回 { bubble, showLoading, hideLoading }
function appendAiMessage() {
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg-ai';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  const loader = document.createElement('div');
  loader.className = 'ai-loading';
  loader.innerHTML = '<div class="ai-spinner"></div><span>竹在观卦…</span>';
  bubble.appendChild(loader);

  wrap.appendChild(bubble);
  aiMessages.appendChild(wrap);

  return {
    bubble,
    hideLoading() { loader.remove(); },
  };
}

// 追加一条用户气泡
function appendUserMessage(text) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg-user';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  wrap.appendChild(bubble);
  aiMessages.appendChild(wrap);

  // 分割线
  const divider = document.createElement('div');
  divider.className = 'chat-divider';
  aiMessages.appendChild(divider);
}

function scrollResultToBottom() {
  const scroll = document.getElementById('result-scroll');
  scroll.scrollTop = scroll.scrollHeight;
}

// 首次解卦
interpretBtn.addEventListener('click', () => {
  if (!currentResult || isAiThinking) return;
  isAiThinking = true;
  interpretBtn.disabled = true;
  interpretBtn.textContent = '竹在聆听…';

  // 切换到对话区
  interpretBtn.classList.add('hidden');
  aiChat.classList.remove('hidden');
  conversationHistory = [];

  const { bubble, hideLoading } = appendAiMessage();
  let fullText = '';
  let firstChunk = true;

  const cursor = document.createElement('span');
  cursor.className = 'cursor-blink';
  cursor.textContent = '|';

  AI.interpret(
    currentResult.question,
    getHexData(),
    (char) => {
      if (firstChunk) { hideLoading(); firstChunk = false; }
      fullText += char;
      bubble.textContent = fullText;
      bubble.appendChild(cursor);
      scrollResultToBottom();
    },
    (content) => {
      bubble.textContent = content;
      conversationHistory.push({ role: 'assistant', content });
      isAiThinking = false;
      aiSendBtn.disabled = false;
      scrollResultToBottom();
    },
    (err) => {
      hideLoading();
      bubble.textContent = `解卦失败：${err.message}`;
      isAiThinking = false;
      interpretBtn.textContent = '问竹（重试）';
      interpretBtn.disabled = false;
      interpretBtn.classList.remove('hidden');
      aiChat.classList.add('hidden');
    }
  );
});

// 追问
function sendFollowUp() {
  if (!currentResult || isAiThinking) return;
  const text = aiFollowInput.value.trim();
  if (!text) return;

  aiFollowInput.value = '';
  aiFollowInput.style.height = '';
  isAiThinking = true;
  aiSendBtn.disabled = true;

  appendUserMessage(text);
  conversationHistory.push({ role: 'user', content: text });

  const { bubble, hideLoading } = appendAiMessage();
  let fullText = '';
  let firstChunk = true;

  const cursor = document.createElement('span');
  cursor.className = 'cursor-blink';
  cursor.textContent = '|';
  scrollResultToBottom();

  AI.chat(
    currentResult.question,
    getHexData(),
    conversationHistory,
    (char) => {
      if (firstChunk) { hideLoading(); firstChunk = false; }
      fullText += char;
      bubble.textContent = fullText;
      bubble.appendChild(cursor);
      scrollResultToBottom();
    },
    (content) => {
      bubble.textContent = content;
      conversationHistory.push({ role: 'assistant', content });
      isAiThinking = false;
      aiSendBtn.disabled = false;
      scrollResultToBottom();
    },
    (err) => {
      hideLoading();
      bubble.textContent = `出错：${err.message}`;
      isAiThinking = false;
      aiSendBtn.disabled = false;
    }
  );
}

aiSendBtn.addEventListener('click', sendFollowUp);

// Enter 发送（Shift+Enter 换行）
aiFollowInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendFollowUp();
  }
});

// 输入框自动高度
aiFollowInput.addEventListener('input', () => {
  aiFollowInput.style.height = 'auto';
  aiFollowInput.style.height = Math.min(aiFollowInput.scrollHeight, 80) + 'px';
});

// ─── 工具 ───
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
