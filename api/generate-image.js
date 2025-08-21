// api/generate-image.js
import OpenAI from "openai";

export default async function handler(req, res) {
  // CORS (trygt å ha på; same-origin i Vercel trenger det egentlig ikke)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  try {
    const { prompt, size = "1024x1024" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY environment variable" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // v5: ikke bruk response_format eller n — base64 kommer som b64_json
    const out = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size
    });

    // send tilbake base64
    res.status(200).json({ imageBase64: out.data[0].b64_json });
  } catch (e) {
    console.error("generate-image error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message = e?.message || e?.response?.data?.error?.message || "Image generation failed";
    res.status(status).json({ error: message });
  }
}
