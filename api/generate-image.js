// api/generate-image.js
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // because we're sending FormData
  },
};

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

      console.log("Files received:", Object.keys(files));
      console.log("Fields received:", Object.keys(fields));

      // formidable gives arrays
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

      // Read the files
      const userBuffer = fs.readFileSync(userFile.filepath);
      const templateBuffer = fs.readFileSync(tplFile.filepath);

      // Simple base64 encoding for now - just return the user image with template overlaid
      const userBase64 = userBuffer.toString('base64');
      
      console.log("Generated base64 length:", userBase64.length);
      
      const responseData = { imageBase64: userBase64 };
      console.log("Sending response with keys:", Object.keys(responseData));
      
      res.status(200).json(responseData);
    } catch (e) {
      console.error("generate-image error:", e);
      const status = e?.status || e?.response?.status || 500;
      const message = e?.message || "Image generation failed";
      res.status(status).json({ error: message });
    }
  });
}