// api/generate-image.js
import OpenAI, { toFile } from "openai";
import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";

export const config = {
  api: {
    bodyParser: false, // fordi vi sender FormData
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const form = formidable({ multiples: false });
  
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      // LOGG for å se hva som faktisk kom inn:
      console.log("Files received:", Object.keys(files));
      console.log("Fields received:", Object.keys(fields));

      // NB: formidable gir arrays
      const userFile = files.userImage?.[0];
      const templFiles = files.templateImage ? (Array.isArray(files.templateImage) ? files.templateImage : [files.templateImage]) : [];
      
      if (!userFile) {
        console.log("userFile missing, available files:", Object.keys(files));
        return res.status(400).json({ error: "Missing userImage" });
      }
      if (templFiles.length < 2) {
        console.log("Need 2 templateImage files, got:", templFiles.length);
        return res.status(400).json({ error: "Need TWO templateImage files" });
      }

      const userBuf = fs.readFileSync(userFile.filepath);
      const leftTemplateBuf = fs.readFileSync(templFiles[0].filepath);
      const rightTemplateBuf = fs.readFileSync(templFiles[1].filepath);

      // ---- prompt handling (strongly separated) ----
      const promptArr = Array.isArray(fields.prompt) ? fields.prompt : [];
      const promptLeft = (fields.promptLeft?.[0] ?? promptArr[0] ?? "Blend edges subtly, add natural shadows and lighting. Don't change the content, just improve the integration.").toString();
      const promptRight = (fields.promptRight?.[0] ?? promptArr[1] ?? "Blend this face mask naturally with the person's face. Make it look like they're wearing the mask. Don't change anything else.").toString();

      const size = (fields.size?.[0] || '1024x1024').toString();
      const typeLeft = (fields.typeLeft?.[0] || fields.type?.[0] || 'edit');
      const typeRight = (fields.typeRight?.[0] || fields.type?.[0] || 'overlay');

      const baseImg = sharp(userBuf).rotate();
      const { width: uW = 1024, height: uH = 1024 } = await baseImg.metadata();

      // opaque canvas with a transparent "hole" = allowed edit region
      async function buildHoleMask(holeLeft, holeTop, holeW, holeH) {
        const hole = await sharp({
          create: { width: holeW, height: holeH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
        }).png().toBuffer();
        return sharp({
          create: { width: uW, height: uH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
        }).composite([{ input: hole, left: holeLeft, top: holeTop }]).png().toBuffer();
      }

      async function makePanel(templateBuffer, type, customPrompt, panelId) {
        const tMeta = await sharp(templateBuffer).metadata();
        const tW = tMeta.width || 1;
        const tH = tMeta.height || 1;

        // === original math ===
        const targetTemplateWidth = Math.floor(uW * 0.15);
        const targetTemplateHeight = Math.floor((tH / tW) * targetTemplateWidth);
        const defaultLeft = Math.floor(uW * 0.6);
        const defaultTop = Math.floor(uH * 0.4);

        let compositeLeft = defaultLeft;
        let compositeTop = defaultTop;
        let resizedTemplate;
        let compositeBlend = 'over';

        if (type === 'overlay') {
          const maskWidth = Math.floor(uW * 0.3);
          const maskHeight = Math.floor((tH / tW) * maskWidth);
          resizedTemplate = await sharp(templateBuffer).resize(maskWidth, maskHeight).png().toBuffer();
          compositeLeft = Math.floor(uW * 0.35);
          compositeTop = Math.floor(uH * 0.2);
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
        const maskFile = await toFile(regionMask, `${panelId}-mask.png`);

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
          console.warn(`[${panelId}] gpt-image-1 edit failed; falling back`, e?.message);
          return composited;
        }
      }

      // run them in parallel so there's no cross-talk
      const [leftPanel, rightPanel] = await Promise.all([
        makePanel(leftTemplateBuf, typeLeft, promptLeft, 'left'),
        makePanel(rightTemplateBuf, typeRight, promptRight, 'right'),
      ]);

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

      res.status(200).json({ imageBase64: output.toString('base64') });
    } catch (e) {
      console.error("generate-image error:", e);
      const status = e?.status || e?.response?.status || 500;
      const message = e?.message || "Image generation failed";
      res.status(status).json({ error: message });
    }
  });
}