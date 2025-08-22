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
    // Handle both JSON and form data
    let prompt, size = "1024x1024", type, userImage, templateImage;
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // This is multipart form data from the frontend
      prompt = req.body?.prompt || "Generate image with job application template";
      size = req.body?.size || "1024x1024";
      type = req.body?.type || "edit";
      // Note: File handling would need multer or similar in a real Vercel function
      // For now, we'll use a fallback approach
    } else {
      // JSON body
      const body = req.body || {};
      prompt = body.prompt;
      size = body.size || "1024x1024";
    }
    
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY environment variable" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Generate image using DALL-E
    const out = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      response_format: "b64_json"
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
