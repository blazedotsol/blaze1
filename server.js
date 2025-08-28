import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI, { toFile } from 'openai'; // if your SDK lacks this export, use: import { toFile } from 'openai/uploads';
import multer from 'multer';
import sharp from 'sharp';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// --- Multer: in-memory buffers ---
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY })
);

/**
 * POST /api/generate-image
 * multipart/form-data
 *   userImage:           base photo (required)
 *   templateImage:       [0]=copy.png (left panel), [1]=mask.png (right panel)  (required x2)
 *   typeLeft:            "edit" | "overlay"   (default: "edit")
 *   typeRight:           "edit" | "overlay"   (default: "overlay")
 *   promptLeft:          string (optional)
 *   promptRight:         string (optional)
 *   size:                "1024x1024" | "512x512" | "256x256"  (default: "1024x1024")
 */
app.post(
  '/api/generate-image',
  upload.fields([
    { name: 'userImage', maxCount: 1 },
    { name: 'templateImage', maxCount: 2 }, // [0] = left (application), [1] = right (mask)
  ]),
  async (req, res) => {
    try {
      // --- inputs & basic checks ---
      const userFile = req.files?.userImage?.[0];
      const templFiles = (req.files?.templateImage as Express.Multer.File[]) || [];

      if (!userFile) return res.status(400).json({ error: 'Missing userImage' });
      if (templFiles.length < 2)
        return res
          .status(400)
          .json({ error: 'Provide TWO templateImage files: [0]=application (copy.png), [1]=mask (mask.png)' });

      const userBuf = userFile.buffer;
      const leftTemplateBuf = templFiles[0].buffer;  // application / copy.png
      const rightTemplateBuf = templFiles[1].buffer; // mask / mask.png

      const {
        size = '1024x1024',
        typeLeft = 'edit',
        typeRight = 'overlay',
        promptLeft = "Blend edges subtly, add natural shadows and lighting. Don't change the content, just improve the integration.",
        promptRight = "Blend this face mask naturally with the person's face. Make it look like they're wearing the mask. Don't change anything else.",
      } = req.body || {};

      // --- base image metadata (auto-orient) ---
      const baseImg = sharp(userBuf).rotate();
      const { width: uW = 1024, height: uH = 1024 } = await baseImg.metadata();

      // utility: build a fully-opaque mask then punch a transparent hole where edits are allowed
      async function buildHoleMask(holeLeft: number, holeTop: number, holeW: number, holeH: number) {
        const hole = await sharp({
          create: { width: holeW, height: holeH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
        })
          .png()
          .toBuffer();
        return sharp({
          create: { width: uW, height: uH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
        })
          .composite([{ input: hole, left: holeLeft, top: holeTop }])
          .png()
          .toBuffer();
      }

      // core one-panel builder: **same math & blends as your current code**
      async function makePanel(templateBuffer: Buffer, type: 'overlay' | 'edit', customPrompt: string) {
        const tMeta = await sharp(templateBuffer).metadata();
        const tW = tMeta.width || 1;
        const tH = tMeta.height || 1;

        // defaults for "edit" (document in hand)
        const targetTemplateWidth = Math.floor(uW * 0.15);
        const targetTemplateHeight = Math.floor((tH / tW) * targetTemplateWidth);
        const defaultLeft = Math.floor(uW * 0.6);
        const defaultTop = Math.floor(uH * 0.4);

        let compositeLeft = defaultLeft;
        let compositeTop = defaultTop;
        let resizedTemplate: Buffer;
        let compositeBlend: 'over' | 'multiply' = 'over'; // default for "edit"

        if (type === 'overlay') {
          // mask-on-face branch (your current overlay math)
          const maskWidth = Math.floor(uW * 0.3);
          const maskHeight = Math.floor((tH / tW) * maskWidth);
          resizedTemplate = await sharp(templateBuffer).resize(maskWidth, maskHeight).png().toBuffer();
          compositeLeft = Math.floor(uW * 0.35);
          compositeTop = Math.floor(uH * 0.2);
          compositeBlend = 'multiply';
        } else {
          // document-in-hand branch (your current edit math)
          resizedTemplate = await sharp(templateBuffer)
            .resize(targetTemplateWidth, targetTemplateHeight)
            .png()
            .toBuffer();
        }

        // Sharp composite first (deterministic)
        const composited = await sharp(userBuf)
          .rotate()
          .composite([{ input: resizedTemplate, left: compositeLeft, top: compositeTop, blend: compositeBlend }])
          .png()
          .toBuffer();

        // Optional AI polish with **gpt-image-1** (masked to just the overlay region)
        if (!process.env.OPENAI_API_KEY) return composited;

        try {
          const regionMask = await buildHoleMask(
            compositeLeft,
            compositeTop,
            (await sharp(resizedTemplate).metadata()).width || 1,
            (await sharp(resizedTemplate).metadata()).height || 1
          );

          const imageFile = await toFile(composited, 'panel.png');
          const maskFile = await toFile(regionMask, 'mask.png');

          const editResp = await openai.images.edit({
            model: 'gpt-image-1',
            image: imageFile,
            mask: maskFile,
            prompt: customPrompt,
            size, // e.g., "1024x1024"
            response_format: 'b64_json',
          });

          const b64 = editResp.data?.[0]?.b64_json;
          return b64 ? Buffer.from(b64, 'base64') : composited;
        } catch (err) {
          console.warn('gpt-image-1 edit failed; using sharp composite:', (err as Error)?.message);
          return composited;
        }
      }

      // Build both panels independently with their own prompt + type
      const leftPanel = await makePanel(leftTemplateBuf, typeLeft, promptLeft);
      const rightPanel = await makePanel(rightTemplateBuf, typeRight, promptRight);

      // Stitch side-by-side
      const gap = Math.max(20, Math.floor(uW * 0.02));
      const finalW = uW * 2 + gap;
      const finalH = uH;

      const output = await sharp({
        create: { width: finalW, height: finalH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
      })
        .composite([
          { input: leftPanel, left: 0, top: 0 },
          { input: rightPanel, left: uW + gap, top: 0 },
        ])
        .png()
        .toBuffer();

      return res.json({ imageBase64: output.toString('base64') });
    } catch (e: any) {
      console.error('Two-box image processing error:', e);
      return res.status(e?.status || e?.response?.status || 500).json({
        error: e?.message || 'Image processing failed',
      });
    }
  }
);

app.listen(3001, () => console.log('API on :3001'));