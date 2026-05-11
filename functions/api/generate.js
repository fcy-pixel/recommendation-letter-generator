const QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const MODEL = "qwen-plus";

const SYSTEM_PROMPT = `你是一位專業的香港小學行政人員，專門撰寫升中推薦信。請根據以下資料，以正式繁體中文撰寫一份完整的升中推薦信。

【嚴格格式要求】
1. 純文字輸出，絕對不使用任何 Markdown 符號（**、##、*、-、> 等）
2. 信件第一行：「致 [學校名稱][收件人]：」
3. 信件第二行：「推薦信」（無縮排）
4. 正文共三段，每段開頭使用兩個全形空格縮排（　　）
5. 第一段：介紹學生品格特質及過往職務，語氣讚賞
6. 第二段：學術成績、特別成就及學習態度
7. 第三段：本年度職務、綜合推薦；末句固定為「若能取錄[姓名]，本人深信以[性別代詞]的能力及性格，在 貴校的培育下，定能大放異彩。」
8. 第三段後另起一行：「　　茲特推薦[姓名]同學前來晉謁，祈賜機會，無任銘感。如需更多資料，本人樂意提供，謹此叩謝！」
9. 最後結尾部分，每行前加20個全形空格以靠右：
　　　　　　　　　　　　　　　　　　　　　　[小學名稱]
　　　　　　　　　　　　　　　　　　　　　　校 長
　　　　　　　　　　　　　　　　　　　　　　[校長姓名] 謹啟
　　　　　　　　　　　　　　　　　　　　　　[日期]
10. 性別代詞：女生用「她」，男生用「他」（例：「她的能力」「他的表現」）
11. 語氣正式誠懇，措辭符合香港學校文化`;

function buildUserPrompt(student, school) {
  return `目標學校：${school.name}
收件人：${school.contact || "校長"}
學生姓名：${student.name}
性別：${student.gender}（代詞用「${student.gender === '男' ? '他' : '她'}」）
個人特質：${student.traits || "（未提供）"}
曾擔任職務：${student.positions || "（未提供）"}
學術表現：${student.academic || "（未提供）"}
特別成就：${student.achievements || "（未提供）"}
學習態度：${student.attitude || "（未提供）"}
本年度擔任職務：${student.currentRole || "（未提供）"}
補充資料：${student.extra || "無"}
小學名稱：${student.primarySchool}
校長姓名：${student.principal}
日期：${student.date}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const apiKey = env.QWEN_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "伺服器未設定 API Key，請聯絡管理員。" }), {
      status: 500,
      headers,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "請求格式錯誤" }), { status: 400, headers });
  }

  const { student, school } = body;
  if (!student || !school) {
    return new Response(JSON.stringify({ error: "缺少 student 或 school 資料" }), { status: 400, headers });
  }

  try {
    const qwenRes = await fetch(QWEN_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(student, school) },
        ],
        temperature: 0.4,
        max_tokens: 1600,
      }),
    });

    if (!qwenRes.ok) {
      let msg = `Qwen API HTTP ${qwenRes.status}`;
      try {
        const err = await qwenRes.json();
        msg = err.error?.message || msg;
      } catch {}
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers });
    }

    const data = await qwenRes.json();
    const result = (data.choices?.[0]?.message?.content || "（無回應）").trim();
    return new Response(JSON.stringify({ result }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
