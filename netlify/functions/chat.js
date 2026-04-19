exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'API key not configured' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { question, hexagramData, messages: followUpMessages } = body;
  if (!question || !hexagramData) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing question or hexagramData' }) };
  }

  const { ganzhi, benkua, biankua, yaos } = hexagramData;

  const yaoLines = yaos
    .slice()
    .reverse()
    .map((y, i) => {
      const posNames = ['上爻', '五爻', '四爻', '三爻', '二爻', '初爻'];
      const shi = y.shi ? '【世】' : '';
      const ying = y.ying ? '【应】' : '';
      const dong = y.moving ? (y.value === 9 ? '○老阳动' : '×老阴动') : '静';
      return `${posNames[i]}：${y.liuqin} ${y.dizhi}${y.wuxing} ${dong}${shi}${ying}`;
    })
    .join('\n');

  const systemPrompt = `你是一位精通六爻纳甲的易学大师，温柔而睿智。你的解卦风格温暖、有深度，既尊重传统易理，又能结合现实给出实用的心理支持。请用流畅的中文解读，避免机械堆砌术语，让提问者感到被理解和抚慰。`;

  const hexagramContext = `占卜时间：${ganzhi.year}年 ${ganzhi.month}月 ${ganzhi.day}日 ${ganzhi.hour}时
旬空：${ganzhi.xunkong.length > 0 ? ganzhi.xunkong.join('、') : '无'}

所问之事：${question}

本卦：${benkua.name}（${benkua.gong}宫）
${biankua ? `变卦：${biankua.name}（${biankua.gong}宫）` : '（无动爻，无变卦）'}

六爻排列（上→下）：
${yaoLines}`;

  let apiMessages;

  if (followUpMessages && followUpMessages.length > 0) {
    // 追问：在卦象上下文基础上延续对话
    apiMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: hexagramContext + '\n\n请先为我解读此卦。' },
      ...followUpMessages,
    ];
  } else {
    // 首次解卦
    const userPrompt = hexagramContext + `\n\n请从以下几个角度解读：
1. 卦象总体氛围，吉凶与核心提示（2-3句，有温度）
2. 世爻与应爻的关系（说明事情走向）
3. 动爻的变化含义（如有）
4. 给提问者的一句心灵寄语

语气：如挚友般温柔，不说教，不绝对化，留有余地。`;
    apiMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        stream: true,
        max_tokens: 1200,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: errText }),
      };
    }

    // Collect stream and forward as SSE text
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) result += content;
          } catch {}
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ content: result }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
