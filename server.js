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
    { name: 'templateImage', maxCount: 1 }         // either job application or mask
  ]),
  async (req, res) => {
    try {
      const {
        size = "1024x1024",
        mode = "hold", // "hold" or "wear"
        promptHold = "Blend the paper so it looks like the character is holding a job application; match lighting and add a subtle contact shadow from the hand. Keep everything else unchanged.",
        promptWear = "Make the overlay look like a face mask the person is wearing; match skin lighting, add strap/edge shading if needed, and keep all non-face regions unchanged."
      } = req.body || {};

      const userFile = req.files?.userImage?.[0];
      const templateFile = req.files?.templateImage?.[0];

      if (!userFile) return res.status(400).json({ error: "Missing userImage" });
      if (!templateFile) return res.status(400).json({ error: "Missing templateImage" });

      const userBuf = userFile.buffer;
      const templateBuf = templateFile.buffer;

      // Normalize orientation + read metadata
      const userSharp = sharp(userBuf).rotate();
      const { width: uW, height: uH } = await userSharp.metadata();

      let output;

      if (mode === "hold") {
        // Heuristics for hand/hold placement (tune these to your input set):
        const holdW = Math.floor(uW * 0.22);
        const appMeta = await sharp(templateBuf).metadata();
        const holdH = Math.floor((appMeta.height / appMeta.width) * holdW);
        const holdLeft = Math.floor(uW * 0.60);
        const holdTop  = Math.floor(uH * 0.45);

        const appResized = await sharp(templateBuf).resize(holdW, holdH).png().toBuffer();

        const heldComposite = await userSharp
          .composite([{ input: appResized, left: holdLeft, top: holdTop, blend: 'over' }])
          .png()
          .toBuffer();

        // Optional AI polish (restrict edits to just the paper area)
        const heldMask = await sharp({
          create: { width: uW, height: uH, channels: 4, background: { r:0, g:0, b:0, alpha:1 } }
        }).composite([{
          input: await sharp({
            create: { width: holdW, height: holdH, channels: 4, background: { r:0, g:0, b:0, alpha:0 } }
          }).png().toBuffer(),
          left: holdLeft, top: holdTop
        }]).png().toBuffer();

        output = heldComposite;

        if (USE_AI) {
          try {
            // gpt-image-1 supports image editing with a mask; transparent = editable area.
            const ai1 = await openai.images.edits({
              model: "gpt-image-1",
              image: output,       // buffer
              mask: heldMask,      // buffer
              prompt: promptHold,
              size,
              response_format: "b64_json",
            });
            output = Buffer.from(ai1.data[0].b64_json, "base64");
          } catch (e) {
            console.warn("AI hold-blend failed; using sharp composite.", e?.message);
          }
        }
      } else if (mode === "wear") {
        // Simple center-top face heuristic; (optional) replace with real face detection if needed.
        const maskW = Math.floor(uW * 0.30);
        const mMeta = await sharp(templateBuf).metadata();
        const maskH = Math.floor((mMeta.height / mMeta.width) * maskW);

        const faceLeft = Math.floor(uW * 0.35);
        const faceTop  = Math.floor(uH * 0.20);

        const resizedMask = await sharp(templateBuf).resize(maskW, maskH).png().toBuffer();

        const wearComposite = await sharp(userBuf).rotate()
          .composite([{
            input: resizedMask,
            left: faceLeft,
            top: faceTop,
            blend: 'over',
            opacity: 0.92 // slight see-through looks more natural than multiply
          }])
          .png()
          .toBuffer();

        // Optional AI polish for Section 2 (restrict edits to just the face-mask area)
        const wearAreaMask = await sharp({
          create: { width: uW, height: uH, channels: 4, background: { r:0, g:0, b:0, alpha:1 } }
        }).composite([{
          input: await sharp({
            create: { width: maskW, height: maskH, channels: 4, background: { r:0, g:0, b:0, alpha:0 } }
          }).png().toBuffer(),
          left: faceLeft, top: faceTop
        }]).png().toBuffer();

        output = wearComposite;

        if (USE_AI) {
          try {
            const ai2 = await openai.images.edits({
              model: "gpt-image-1",
              image: output,       // buffer
              mask: wearAreaMask,  // buffer
              prompt: promptWear,
              size,
              response_format: "b64_json",
            });
            output = Buffer.from(ai2.data[0].b64_json, "base64");
          } catch (e) {
            console.warn("AI wear-mask blend failed; using sharp composite.", e?.message);
          }
        }
      }

      return res.json({ imageBase64: output.toString('base64') });
    } catch (e) {
      console.error("Image processing error:", e);
      const status = e?.status || e?.response?.status || 500;
      return res.status(status).json({ error: e?.message || "Image processing failed" });
    }
  }
);

app.listen(3001, () => console.log("API on :3001"));