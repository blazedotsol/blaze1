import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI, { toFile } from 'openai';
import multer from 'multer';
import sharp from 'sharp';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post(
  '/api/generate-image',
  upload.fields([
    { name: 'userImage', maxCount: 1 },
    { name: 'templateImage', maxCount: 2 }, // [0] left (application), [1] right (mask)
    { name: 'prompt', maxCount: 2 },        // optional: prompt[]=..., prompt[]=...
  ]),
  async (req, res) => {
    try {
      const userFile = req.files?.userImage?.[0];
      const templFiles = (req.files?.templateImage as Express.Multer.File[]) || [];
      if (!userFile) return res.status(400).json({ error: 'Missing userImage' });
      if (templFiles.length < 2) return res.status(400).json({ error: 'Need TWO templateImage files' });

      const userBuf = userFile.buffer;
      const leftTemplateBuf  = templFiles[0].buffer; // copy.png
      const rightTemplateBuf = templFiles[1].buffer; // mask.png

      // ---- prompt handling (strongly separated) ----
      const body = req.body || {};
      const promptArr = Array.isArray(body.prompt) ? body.prompt : [];
      const promptLeft  = (body.promptLeft  ?? promptArr[0] ?? "Blend edges subtly, add natural shadows and lighting. Don't change the content, just improve the integration.").toString();
      const promptRight = (body.promptRight ?? promptArr[1] ?? "Blend this face mask naturally with the person's face. Make it look like they're wearing the mask. Don't change anything else.").toString();

      const size = (body.size || '1024x1024').toString();
      const typeLeft  = (body.typeLeft  || body.type || 'edit') as 'edit' | 'overlay';
      const typeRight = (body.typeRight || body.type || 'overlay') as 'edit' | 'overlay';

      const baseImg = sharp(userBuf).rotate();
      const { width: uW = 1024, height: uH = 1024 } = await baseImg.metadata();

      // opaque canvas with a transparent "hole" = allowed edit region
      async function buildHoleMask(holeLeft: number, holeTop: number, holeW: number, holeH: number) {
        const hole = await sharp({
          create: { width: holeW, height: holeH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
        }).png().toBuffer();
        return sharp({
          create: { width: uW, height: uH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
        }).composite([{ input: hole, left: holeLeft, top: holeTop }]).png().toBuffer();
      }

      async function makePanel(
        templateBuffer: Buffer,
        type: 'overlay' | 'edit',
        customPrompt: string,
        panelId: 'left' | 'right'
      ) {
        const tMeta = await sharp(templateBuffer).metadata();
        const tW = tMeta.width || 1;
        const tH = tMeta.height || 1;

        // === your original math ===
        const targetTemplateWidth  = Math.floor(uW * 0.15);
        const targetTemplateHeight = Math.floor((tH / tW) * targetTemplateWidth);
        const defaultLeft = Math.floor(uW * 0.6);
        const defaultTop  = Math.floor(uH * 0.4);

        let compositeLeft = defaultLeft;
        let compositeTop  = defaultTop;
        let resizedTemplate: Buffer;
        let compositeBlend: 'over' | 'multiply' = 'over';

        if (type === 'overlay') {
          const maskWidth  = Math.floor(uW * 0.3);
          const maskHeight = Math.floor((tH / tW) * maskWidth);
          resizedTemplate = await sharp(templateBuffer).resize(maskWidth, maskHeight).png().toBuffer();
          compositeLeft = Math.floor(uW * 0.35);
          compositeTop  = Math.floor(uH * 0.2);
          compositeBlend = 'multiply';
        } else {
          resizedTemplate = await sharp(templateBuffer).resize(targetTemplateWidth, targetTemplateHeight).png().toBuffer();
        }

        // 1) deterministic composite
        const composited = await sharp(userBuf).rotate()
          .composite([{ input: resizedTemplate, left: compositeLeft, top: compositeTop, blend: compositeBlend }])
          .png()
          .toBuffer();

        if (!process.env.OPENAI_API_KEY) return composited;

        // 2) isolated AI blend for THIS panel only (unique filenames!)
        const rMeta = await sharp(resizedTemplate).metadata();
        const regionMask = await buildHoleMask(compositeLeft, compositeTop, rMeta.width || 1, rMeta.height || 1);

        const imageFile = await toFile(composited, `${panelId}-panel.png`);
        const maskFile  = await toFile(regionMask, `${panelId}-mask.png`);

        try {
          const resp = await openai.images.edit({
            model: 'gpt-image-1',
            image: imageFile,
            mask: maskFile,
            prompt: customPrompt,
            size,
            response_format: 'b64_json',
          });
          const b64 = resp.data?.[0]?.b64_json;
          return b64 ? Buffer.from(b64, 'base64') : composited;
        } catch (e) {
          console.warn(`[${panelId}] gpt-image-1 edit failed; falling back`, (e as Error)?.message);
          return composited;
        }
      }

      // run them in parallel so there's no cross-talk
      const [leftPanel, rightPanel] = await Promise.all([
        makePanel(leftTemplateBuf,  typeLeft,  promptLeft,  'left'),
        makePanel(rightTemplateBuf, typeRight, promptRight, 'right'),
      ]);

      const gap = Math.max(20, Math.floor(uW * 0.02));
      const finalW = uW * 2 + gap;
      const finalH = uH;

      const output = await sharp({
        create: { width: finalW, height: finalH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
      })
        .composite([
          { input: leftPanel,  left: 0,           top: 0 },
          { input: rightPanel, left: uW + gap,    top: 0 },
        ])
        .png()
        .toBuffer();

      res.json({ imageBase64: output.toString('base64') });
    } catch (e: any) {
      console.error('Two-box image processing error:', e);
      res.status(e?.status || e?.response?.status || 500).json({ error: e?.message || 'Image processing failed' });
    }
  }
);

app.get('/api/health', (_req, res) => res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY }));
app.listen(3001, () => console.log('API on :3001'));