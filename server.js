import 'dotenv/config';
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import multer from "multer";
import sharp from "sharp";
import path from "path";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

// --- Multer: use memory storage so req.files.*.buffer exists ---
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const USE_AI = !!process.env.OPENAI_API_KEY; // flip to false to skip AI blending

app.get("/api/health", (_req, res) => res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY }));

app.post("/api/generate-image",
  upload.fields([
    { name: 'userImage', maxCount: 1 },            // the figure/person
    { name: 'templateImage', maxCount: 1 }         // job application template
  ]),
  async (req, res) => {
    try {
      const {
        size = "1024x1024",
        mode = "hold" // "hold" or "wear"
      } = req.body || {};

      const userFile = req.files?.userImage?.[0];
      const templateFile = req.files?.templateImage?.[0];

      if (!userFile) return res.status(400).json({ error: "Missing userImage" });
      if (!templateFile) return res.status(400).json({ error: "Missing templateImage" });

      console.log("Processing mode:", mode);
      console.log("User file size:", userFile.size);
      console.log("Template file size:", templateFile.size);

      const userBuf = userFile.buffer;
      const templateBuf = templateFile.buffer;

      // Normalize orientation + read metadata
      const userSharp = sharp(userBuf).rotate();
      const { width: uW, height: uH } = await userSharp.metadata();

      console.log("User image dimensions:", uW, "x", uH);

      let output;

      if (mode === "hold") {
        // Simple composite for holding job application
        const holdW = Math.floor(uW * 0.22);
        const appMeta = await sharp(templateBuf).metadata();
        const holdH = Math.floor((appMeta.height / appMeta.width) * holdW);
        const holdLeft = Math.floor(uW * 0.60);
        const holdTop  = Math.floor(uH * 0.45);

        console.log("Hold placement:", holdLeft, holdTop, holdW, holdH);

        const appResized = await sharp(templateBuf).resize(holdW, holdH).png().toBuffer();

        output = await userSharp
          .composite([{ input: appResized, left: holdLeft, top: holdTop, blend: 'over' }])
          .png()
          .toBuffer();

        console.log("Hold composite created, size:", output.length);
      } else if (mode === "wear") {
        // Simple composite for wearing mask
        const maskW = Math.floor(uW * 0.30);
        const mMeta = await sharp(templateBuf).metadata();
        const maskH = Math.floor((mMeta.height / mMeta.width) * maskW);

        const faceLeft = Math.floor(uW * 0.35);
        const faceTop  = Math.floor(uH * 0.20);

        console.log("Wear placement:", faceLeft, faceTop, maskW, maskH);

        const resizedMask = await sharp(templateBuf).resize(maskW, maskH).png().toBuffer();

        output = await sharp(userBuf).rotate()
          .composite([{
            input: resizedMask,
            left: faceLeft,
            top: faceTop,
            blend: 'over',
            opacity: 0.92
          }])
          .png()
          .toBuffer();

        console.log("Wear composite created, size:", output.length);
      }

      const base64Result = output.toString('base64');
      console.log("=== SERVER RESPONSE DEBUG ===");
      console.log("Generated base64 length:", base64Result.length);
      console.log("Base64 first 100 chars:", base64Result.substring(0, 100));
      console.log("About to send response with keys:", Object.keys({ imageBase64: base64Result }));
      console.log("=== END SERVER DEBUG ===");
      
      if (!base64Result || base64Result.length === 0) {
        throw new Error("Generated image is empty");
      }
      
      const responseData = { imageBase64: base64Result };
      console.log("Final response object keys:", Object.keys(responseData));
      return res.json(responseData);
    } catch (e) {
      console.error("Image processing error:", e);
      const status = e?.status || e?.response?.status || 500;
      return res.status(status).json({ error: e?.message || "Image processing failed" });
    }
  }
);

app.listen(3001, () => console.log("API on :3001"));