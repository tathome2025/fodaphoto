const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function toSafeError(error, fallback = "AI 請求失敗。") {
  if (!error) {
    return fallback;
  }
  if (typeof error === "string") {
    return error;
  }
  return error.message || fallback;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "Missing OPENAI_API_KEY in Vercel Environment Variables.",
    });
  }

  const body = req.body || {};
  const model = body.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!messages.length) {
    return res.status(400).json({
      ok: false,
      error: "messages is required and must be a non-empty array.",
    });
  }

  const payload = {
    model,
    messages,
    temperature: typeof body.temperature === "number" ? body.temperature : 0.2,
  };

  if (typeof body.max_tokens === "number") {
    payload.max_tokens = body.max_tokens;
  }

  try {
    const upstream = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const upstreamJson = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        ok: false,
        error: upstreamJson?.error?.message || toSafeError(upstreamJson, "OpenAI API error"),
      });
    }

    const answer = upstreamJson?.choices?.[0]?.message?.content || "";
    return res.status(200).json({
      ok: true,
      model: upstreamJson.model,
      content: answer,
      usage: upstreamJson.usage || null,
      raw: upstreamJson,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: toSafeError(error),
    });
  }
}
