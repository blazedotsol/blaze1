// api/generate-image.js
import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // fordi vi sender FormData
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const form = formidable({ multiples: false });
  
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      // NB: formidable gir arrays
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

      const result = await openai.images.edit({
        model: "gpt-image-1",
        prompt: "Insert the provided job application image so the character is holding it. Do not modify the person, background, colors, lighting, style, proportions, or any other elements of the original image. Preserve all original details and resolution exactly as they are, except for adding the paper.",
        image: [baseStream, tplStream], // VIKTIG: to bilder
        size: "1024x1024",
      });

      const b64 = result.data[0].b64_json;
      res.status(200).json({ dataUrl: `data:image/png;base64,${b64}` });
    } catch (e) {
      console.error("generate-image error:", e);
      const status = e?.status || e?.response?.status || 500;
      const message = e?.message || "Image generation failed";
      return res.status(status).json({
        error: message,
        details: e?.response?.data || null
      });
    }
  });
}