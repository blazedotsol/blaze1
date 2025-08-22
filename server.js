import 'dotenv/config';
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/health", (_req, res) => res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY }));

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, size = "1024x1024", userImage, templateImage, type } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set on the server" });
    }

    let out;
    
    if (type === "edit" && userImage) {
      // Use image editing with the user's uploaded image
      const imageBuffer = Buffer.from(userImage, 'base64');
      
      out = await openai.images.edit({
        model: "dall-e-2", // dall-e-2 supports image editing
        image: imageBuffer,
        prompt: prompt + (templateImage ? " Use the job application template provided as reference." : ""),
        size,
        response_format: "b64_json",
      });
    } else {
      // Fallback to regular generation
      out = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        size,
        response_format: "b64_json",
      });
    }

    return res.json({ imageBase64: out.data[0].b64_json });
  } catch (e) {
    // gi nyttig feilmelding tilbake til klienten
    const status = e?.status || e?.response?.status || 500;
    const data = e?.response?.data || e?.message || String(e);
    console.error("OpenAI error:", status, data);
    return res.status(status).json({
      error:
        typeof data === "string"
          ? data
          : data?.error?.message || JSON.stringify(data),
    });
  }
});

app.listen(3001, () => console.log("API on :3001"));