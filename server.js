import 'dotenv/config';
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/health", (_req, res) => res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY }));

app.post("/api/generate-image", upload.fields([
  { name: 'userImage', maxCount: 1 },
  { name: 'templateImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { prompt, size = "1024x1024", type } = req.body || {};
    const userImageFile = req.files?.userImage?.[0];
    const templateImageFile = req.files?.templateImage?.[0];
    
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    // Use DALL-E 2 image editing
    const out = await openai.images.edit({
      model: "dall-e-2",
      image: userImageBuffer,
      prompt,
      size,
      response_format: "b64_json",
    });

    // Clean up uploaded files
    fs.unlinkSync(userImageFile.path);
    if (templateImageFile) {
      fs.unlinkSync(templateImageFile.path);
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