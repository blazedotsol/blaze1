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
      const tplFile = files.templateImage?.[0];
      
      if (!userFile) {
        console.log("userFile missing, available files:", Object.keys(files));
        return res.status(400).json({ error: "Missing userImage" });
      }
      if (!tplFile) {
        console.log("tplFile missing, available files:", Object.keys(files));
        return res.status(400).json({ error: "Missing templateImage" });
      }

      const baseStream = fs.createReadStream(userFile.filepath);
      const tplStream = fs.createReadStream(tplFile.filepath);

      // Different prompts based on the request type or use a default
      let prompt = "Composite the provided job application onto the uploaded photo so it looks naturally held by the figure. Use the uploaded photo exactly as it is — do not redraw or modify any part of it. Every pixel must remain identical except for blending in the paper. Preserve the photo’s original aspect ratio, resolution, colors, and style.";
      
      const result = await openai.images.edit({
        model: "gpt-image-1",
        prompt: prompt,
        image: [baseStream, tplStream], // VIKTIG: to bilder
        size: "1024x1024",
      });

      const b64 = result.data[0].b64_json;
      res.status(200).json({ dataUrl: `data:image/png;base64,${b64}` });
    } catch (e) {
      console.error("generate-image error:", e);
      const status = e?.status || e?.response?.status || 500;
      const message = e?.message || "Image generation failed";
      res.status(status).json({ error: message });
    }
  });
}