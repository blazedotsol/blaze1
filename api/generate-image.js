// api/generate-image.js
import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";
import sizeOf from "image-size";

export const config = {
  api: { bodyParser: false }, // because we send FormData
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Use POST" });

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      const userFile = files.userImage?.[0];
      const tplFile = files.templateImage?.[0];

      if (!userFile) {
        return res.status(400).json({ error: "Missing userImage" });
      }
      if (!tplFile) {
        return res.status(400).json({ error: "Missing templateImage" });
      }

      const baseStream = fs.createReadStream(userFile.filepath);
      const tplStream = fs.createReadStream(tplFile.filepath);

      // Choose prompt based on "mode" field
      const mode = fields.mode?.[0] || "insert";

      const insertPrompt = `
        Add the provided job application so the figure is holding it.
        Keep the photo unchanged in every detail — person, background, colors, lighting, style. Only insert the paper. Preserve aspect ratio and resolution.
      `.trim();

      const overlayPrompt = `
        Overlay the uploaded employment/job application document so it fully covers the entire target image frame. Preserve all original details, text, and formatting of the document. Keep the background image fully visible behind the document, with natural blending so the paper looks overlaid rather than replacing the background."
      `.trim();

      const prompt = mode === "overlay" ? overlayPrompt : insertPrompt;

      // Preserve original size instead of forcing square
      const { width, height } = sizeOf(userFile.filepath);
      const size = `${width}x${height}`;

      const result = await openai.images.edit({
        model: "gpt-image-1",
        prompt,
        image: [baseStream, tplStream],
        size,
        seed: 123, // optional, for more consistent outputs
      });

      const b64 = result.data[0].b64_json;
      res
        .status(200)
        .json({ dataUrl: `data:image/png;base64,${b64}` });
    } catch (e) {
      console.error("generate-image error:", e);
      const status = e?.status || e?.response?.status || 500;
      const message = e?.message || "Image generation failed";
      res.status(status).json({ error: message });
    }
  });
}