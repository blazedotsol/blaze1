const OpenAI = require("openai");

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { prompt, size = "1024x1024" } = req.body || {};
    
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY environment variable" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const out = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size,
      response_format: "b64_json",
    });

    return res.status(200).json({ imageBase64: out.data[0].b64_json });
  } catch (e) {
    console.error("OpenAI error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message = e?.message || e?.response?.data?.error?.message || "Image generation failed";
    return res.status(status).json({ error: message });
  }
};