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

      const result = await openai.images.edits({
        model: "gpt-image-1",
        prompt:
          'Make this figure/character in the uploaded photo hold this job application from the template. ' +
          'Place the job application naturally in their hands or in front of them. ' +
          "Don't change anything else about the image. Keep the same aspect ratio and style.",
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