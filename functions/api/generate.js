export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '無效的請求格式' }, { status: 400 });
  }

  const { student, school } = body || {};
  if (!student?.name || !school?.name) {
    return Response.json({ error: '缺少必要欄位' }, { status: 400 });
  }

  const apiKey = env.QWEN_API_KEY;
  if (!apiKey) {
    return Response.json({ error: '伺服器未設定 API 金鑰' }, { status: 500 });
  }

  const pronoun = student.gender === '男' ? '他' : '她';
  const pronoun2 = student.gender === '男' ? '他' : '她';
  const contact = school.contact ? `${school.contact}` : '校長';

  const prompt = `你是一位香港小學校長，請以第一人稱為以下學生撰寫一封正式的升中推薦信（繁體中文）。

學生資料：
- 姓名：${student.name}
- 性別：${student.gender}
- 個人特質：${student.traits || '不適用'}
- 曾擔任職務：${student.positions || '不適用'}
- 學術表現：${student.academic || '不適用'}
- 特別成就／項目：${student.achievements || '不適用'}
- 學習態度：${student.attitude || '不適用'}
- 本年度擔任職務：${student.currentRole || '不適用'}
- 其他補充：${student.extra || '不適用'}

收信學校：${school.name}
收件人：${contact}
寄件小學：${student.primarySchool}
校長：${student.principal}
日期：${student.date}

格式要求（必須嚴格遵從）：
1. 第一行：「致 ${school.name}　${contact}﹕」
2. 第二行：「推薦信」（單獨一行，不加任何符號）
3. 空一行
4. 正文2–3段，每段開頭空兩個全形空格（　　），語氣正式，用詞流暢，貼合香港小學推薦信文風
5. 最後一段以「如需更多資料，本人樂意提供，謹此叩謝！」結束
6. 空一行
7. 右方署名區（每行前加足夠全形空格令其靠右）：
   　　　　　　　　　　${student.primarySchool}
   　　　　　　　　　　校　長
   　　　　　　　　　　${student.principal}　謹啟
   　　　　　　　　　　${student.date}
8. 只輸出信件內容，不加任何解釋或標記`;

  const qwenRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!qwenRes.ok) {
    const err = await qwenRes.text();
    return Response.json({ error: `Qwen API 錯誤：${qwenRes.status} ${err}` }, { status: 502 });
  }

  const data = await qwenRes.json();
  const result = data?.choices?.[0]?.message?.content || '';

  return Response.json({ result });
}
