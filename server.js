import 'dotenv/config';
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import multer from "multer";
import sharp from "sharp";
import path from "path";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/health", (_req, res) => res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY }));

app.post("/api/generate-image", upload.fields([
  { name: 'userImage', maxCount: 1 },
  { name: 'templateImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { prompt, size = "1024x1024", type = "hold" } = req.body || {};
    const userImageFile = req.files?.userImage?.[0];
    const templateImageFile = req.files?.templateImage?.[0];
    
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    if (!userImageFile) return res.status(400).json({ error: "Missing user image" });
    if (!templateImageFile) return res.status(400).json({ error: "Missing template image" });

    // Read image buffers directly from multer
    const userImageBuffer = userImageFile.buffer;
    const templateImageBuffer = templateImageFile.buffer;

    // Get image dimensions
    const userImage = sharp(userImageBuffer);
    const { width: userWidth, height: userHeight } = await userImage.metadata();
    
    const templateImage = sharp(templateImageBuffer);
    const { width: templateWidth, height: templateHeight } = await templateImage.metadata();

    // Composite the images
    let compositeImage;
    
    if (type === "mask") {
      // For face mask - resize to cover face area and position on face (larger for mask effect)
      const targetTemplateWidth = Math.floor(userWidth * 0.4);
      const targetTemplateHeight = Math.floor((templateHeight / templateWidth) * targetTemplateWidth);
      const left = Math.floor(userWidth * 0.3);
      const top = Math.floor(userHeight * 0.2);

      const resizedTemplate = await templateImage
        .resize(targetTemplateWidth, targetTemplateHeight)
        .png()
        .toBuffer();

      compositeImage = await userImage
        .composite([{
          input: resizedTemplate,
          top: top,
          left: left,
          blend: 'multiply'
        }])
        .png()
        .toBuffer();
    } else if (type === "hold") {
      // Calculate template size (make it about 15% of the user image width)
      const targetTemplateWidth = Math.floor(userWidth * 0.15);
      const targetTemplateHeight = Math.floor((templateHeight / templateWidth) * targetTemplateWidth);

      // Position template in bottom-right area (where a character might hold it)
      const left = Math.floor(userWidth * 0.6);
      const top = Math.floor(userHeight * 0.4);

      // Resize template to fit
      const resizedTemplate = await templateImage
        .resize(targetTemplateWidth, targetTemplateHeight)
        .png()
        .toBuffer();

      // Place template as if character is holding it
      compositeImage = await userImage
        .composite([{
          input: resizedTemplate,
          top: top,
          left: left,
          blend: 'over'
        }])
        .png()
        .toBuffer();
    } else if (type === "edit") {
      // Calculate template size
      const targetTemplateWidth = Math.floor(userWidth * 0.2);
      const targetTemplateHeight = Math.floor((templateHeight / templateWidth) * targetTemplateWidth);

      const resizedTemplate = await templateImage
        .resize(targetTemplateWidth, targetTemplateHeight)
        .png()
        .toBuffer();

      // Create semi-transparent overlay effect
      const transparentTemplate = await sharp(resizedTemplate)
        .composite([{
          input: Buffer.from(`<svg width="${targetTemplateWidth}" height="${targetTemplateHeight}">
            <rect width="100%" height="100%" fill="white" opacity="0.3"/>
          </svg>`),
          blend: 'multiply'
        }])
        .png()
        .toBuffer();

      compositeImage = await userImage
        .composite([{
          input: transparentTemplate,
          top: Math.floor(userHeight * 0.2),
          left: Math.floor(userWidth * 0.2),
          blend: 'overlay'
        }])
        .png()
        .toBuffer();
    } else {
      // Default: just place template
      const targetTemplateWidth = Math.floor(userWidth * 0.15);
      const targetTemplateHeight = Math.floor((templateHeight / templateWidth) * targetTemplateWidth);
      const left = Math.floor(userWidth * 0.6);
      const top = Math.floor(userHeight * 0.4);

      const resizedTemplate = await templateImage
        .resize(targetTemplateWidth, targetTemplateHeight)
        .png()
        .toBuffer();

      compositeImage = await userImage
        .composite([{
          input: resizedTemplate,
          top: top,
          left: left,
          blend: 'over'
        }])
        .png()
        .toBuffer();
    }

    // Optional: Use OpenAI for subtle blending/shadows (only if needed)
    let finalImage = compositeImage;
    if (process.env.OPENAI_API_KEY && (type === "mask" || type === "hold" || type === "edit")) {
      try {
        let blendPrompt;
        if (type === "mask") {
          blendPrompt = "Blend this face mask naturally with the figure/person face. Make it look like they're wearing the mask as a face covering. Don't change anything else about the photo.";
        } else if (type === "hold") {
          blendPrompt = "Composite the provided job application onto the uploaded photo so it looks naturally held by the figure. Use the uploaded photo exactly as it is — do not redraw or modify any part of it. Every pixel must remain identical except for blending in the paper.";
        } else {
          blendPrompt = "Blend edges subtly, add natural shadows and lighting. Don't change the content, just improve the integration.";
        }
          
        const blendResult = await openai.images.edit({
          model: "dall-e-2",
          image: compositeImage,
          prompt: blendPrompt,
          size,
          response_format: "b64_json",
        });
        finalImage = Buffer.from(blendResult.data[0].b64_json, "base64");
      } catch (aiError) {
        console.log("AI blending failed, using composite only:", aiError.message);
        // Continue with composite-only result
      }
    }

    // Convert final result to base64
    const base64Result = finalImage.toString('base64');
    return res.json({ imageBase64: base64Result });
  } catch (e) {
    console.error("Image processing error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message = e?.message || "Image processing failed";
    return res.status(status).json({
      error: message
    });
  }
});

app.listen(3001, () => console.log("API on :3001"));