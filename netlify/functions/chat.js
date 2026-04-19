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

  const systemPrompt = `你是竹语，一位温柔的倾听者，懂易经但不卖弄术语。你的回答像一位老朋友在说话——简单、真诚、直达内心。不要列条目，不要说"第一第二"，用自然的语气娓娓道来。每次回答控制在150字以内，说最重要的一件事，让人读完有豁然开朗或被理解的感觉。`;

  const hexagramContext = `占卜时间：${ganzhi.year}年 ${ganzhi.month}月 ${ganzhi.day}日 ${ganzhi.hour}时
旬空：${ganzhi.xunkong.join('、')}

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
    const userPrompt = hexagramContext + `\n\n请用朋友聊天的口吻，告诉我这个卦在说什么。不要堆术语，不要分条列项，就像你真的了解我的处境，说一段走心的话。150字以内。`;
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
