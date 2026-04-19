/**
 * ai.js — AI 解卦模块，调用 Netlify 代理函数
 */

async function callAI(payload, onChunk, onDone, onError) {
  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let msg = `请求失败 (${response.status})`;
      try { const err = await response.json(); msg = err.error || msg; } catch {}
      throw new Error(msg);
    }

    const data = await response.json();
    const content = data.content || '';

    // 模拟逐字流式输出
    let i = 0;
    const interval = setInterval(() => {
      if (i < content.length) {
        onChunk(content[i]);
        i++;
      } else {
        clearInterval(interval);
        if (onDone) onDone(content);
      }
    }, 28);
  } catch (err) {
    if (onError) onError(err);
  }
}

window.AI = {
  // 首次解卦
  interpret(question, hexagramData, onChunk, onDone, onError) {
    callAI({ question, hexagramData }, onChunk, onDone, onError);
  },

  // 追问（带对话历史）
  chat(question, hexagramData, messages, onChunk, onDone, onError) {
    callAI({ question, hexagramData, messages }, onChunk, onDone, onError);
  },
};
