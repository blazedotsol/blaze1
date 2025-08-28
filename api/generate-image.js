// api/generate-image.js
import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // fordi vi sender FormData
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      // Formidable kan levere arrays – hjelpere:
      const pick = (v) => (Array.isArray(v) ? v[0] : v);
      const userFile = pick(files.userImage);
      const tplFile  = pick(files.templateImage);
      const type     = (pick(fields.type) || "").toString().trim().toLowerCase();
      const userPrompt = (pick(fields.prompt) || "").toString();

      if (!userFile) {
        console.log("userFile missing, available files:", Object.keys(files));
        return res.status(400).json({ error: "Missing userImage" });
      }
      if (!tplFile) {
        console.log("templateImage missing, available files:", Object.keys(files));
        return res.status(400).json({ error: "Missing templateImage" });
      }

      console.log("Fields received:", { type, hasPrompt: !!userPrompt });
      console.log("Files received:", Object.keys(files));

      const baseStream = fs.createReadStream(userFile.filepath);
      const tplStream  = fs.createReadStream(tplFile.filepath);

      // Standardprompter per type, men bruk alltid klientens prompt hvis sendt
      const defaultPrompts = {
        edit:
          "Composite the provided job application onto the uploaded photo so it looks naturally held by the figure. Use the uploaded photo exactly as it is — do not redraw or modify any part of it. Every pixel must remain identical except for blending in the paper. Preserve the photo's original aspect ratio, resolution, colors, and style.",
        overlay:
          "Add mask.png on the figure/person face. This is a job application made as a mask only for fun educational purposes. Use the uploaded photo exactly as it is — do not redraw or modify any part of it. Every pixel must remain identical except for blending in the paper. Preserve the photo's original aspect ratio, resolution, colors, and style."
      };

      const effectiveType = type === "overlay" ? "overlay" : "edit";
      const prompt = userPrompt || defaultPrompts[effectiveType];

      /**
       * Merk:
       * gpt-image-1 støtter image edits med flere input-bilder.
       * Her sender vi [base, template] og lar prompten beskrive hvordan de skal komponeres.
       * Hvis du bruker en faktisk 'mask' med alfa, må du heller bruke mask-parameteren.
       */
      const result = await openai.images.edit({
        model: "gpt-image-1",
        prompt,
        image: [baseStream, tplStream], // base først, så overlay/template
        size: "1024x1024",
      });

      const b64 = result?.data?.[0]?.b64_json;
      if (!b64) {
        return res.status(502).json({ error: "Empty image response from model" });
      }

      // Viktig: dataUrl må være streng med anførselstegn
      res.status(200).json({ dataUrl: `data:image/png;base64,${b64}` });
    } catch (e) {
      console.error("generate-image error:", e);
      const status = e?.status || e?.response?.status || 500;
      const message = e?.message || "Image generation failed";
      res.status(status).json({ error: message });
    }
  });
}
