// api/generate-image.js
import OpenAI from "openai";

export default async function handler(req, res) {
  // (CORS er egentlig unødvendig på same-origin i Vercel, men skader ikke)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  try {
    const { prompt, size = "1024x1024" } = req.body || {};
    if (!prompt) {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY environment variable" });
      return;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const out = await openai.images.generate({
      model: "gpt-image-1",          // <-- riktig modell for bilde-generering
      prompt,
      size,                          // "512x512" | "1024x1024" | "2048x2048" (dersom aktivert)
      response_format: "b64_json",
      n: 1
    });

    res.status(200).json({ imageBase64: out.data[0].b64_json });
  } catch (e) {
    console.error("generate-image error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message =
      e?.message ||
      e?.response?.data?.error?.message ||
      "Image generation failed";
    res.status(status).json({ error: message });
  }
}
