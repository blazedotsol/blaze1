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

  const form = formidable({ multiples: true });
  
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      console.log("Files received:", Object.keys(files));
      console.log("Fields received:", Object.keys(fields));

      const userFile = files.userImage?.[0];
      const templateFiles = files.templateImage || [];
      
      if (!userFile) {
        console.log("userFile missing, available files:", Object.keys(files));
        return res.status(400).json({ error: "Missing userImage" });
      }
      
      // Check if we have 2 template files (new dual implementation)
      if (templateFiles.length === 2) {
        console.log("Using dual template implementation");
        
        const {
          size = '1024x1024',
          typeLeft = 'edit',
          typeRight = 'overlay',
          promptLeft = "Blend edges subtly, add natural shadows and lighting. Don't change the content, just improve the integration.",
          promptRight = "Blend this face mask naturally with the person's face. Make it look like they're wearing the mask. Don't change anything else.",
        } = fields;

        const leftTemplateFile = templateFiles[0];
        const rightTemplateFile = templateFiles[1];

        // Process both panels in parallel
        const [leftResult, rightResult] = await Promise.all([
          processPanel(userFile, leftTemplateFile, promptLeft, size),
          processPanel(userFile, rightTemplateFile, promptRight, size)
        ]);

        // Combine results side by side (simplified - you might want to use Sharp for better control)
        const combinedBase64 = await combineImages(leftResult, rightResult);
        
        res.status(200).json({ imageBase64: combinedBase64 });
        
      } else if (templateFiles.length === 1) {
        console.log("Using single template implementation");
        
        const tplFile = templateFiles[0];
        const prompt = fields.prompt || "Composite the provided job application onto the uploaded photo so it looks naturally held by the figure. Use the uploaded photo exactly as it is — do not redraw or modify any part of it. Every pixel must remain identical except for blending in the paper. Preserve the photo's original aspect ratio, resolution, colors, and style.";
        
        const result = await processPanel(userFile, tplFile, prompt, fields.size || "1024x1024");
        res.status(200).json({ dataUrl: `data:image/png;base64,${result}` });
        
      } else {
        return res.status(400).json({ error: "Need either 1 or 2 templateImage files" });
      }

    } catch (e) {
      console.error("generate-image error:", e);
      const status = e?.status || e?.response?.status || 500;
      const message = e?.message || "Image generation failed";
      res.status(status).json({ error: message });
    }
  });
}

async function processPanel(userFile, templateFile, prompt, size) {
  const baseStream = fs.createReadStream(userFile.filepath);
  const templateStream = fs.createReadStream(templateFile.filepath);

  const result = await openai.images.edit({
    model: "dall-e-2",
    prompt: prompt,
    image: baseStream,
    mask: templateStream,
    size: size,
    response_format: 'b64_json'
  });

  return result.data[0].b64_json;
}

async function combineImages(leftBase64, rightBase64) {
  // Simple horizontal combination - in production you'd use Sharp or similar
  // For now, return the left image (you can enhance this later)
  return leftBase64;
}