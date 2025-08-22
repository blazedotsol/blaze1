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
      console.log("Mode field:", fields.mode);

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
      let prompt = "Insert the provided job application image so the character is holding it. Do not modify the person, background, colors, lighting, style, proportions, or any other elements of the original image. Preserve all original details and resolution exactly as they are, except for adding the paper.";
      
      // Check if this is an overlay request (you could add a field to distinguish)
      if (fields.mode && fields.mode[0] === "overlay") {
        prompt = "Overlay the provided job application image on top of the uploaded photo so it looks naturally integrated. Do not alter or redraw any part of the original photo — preserve all details, colors, lighting, proportions, and background exactly as they are. Only blend the job application paper onto the image, keeping the overall aspect ratio and resolution unchanged. The final result should look like the uploaded photo with the job application realistically overlaid on it, nothing else.";
      }

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