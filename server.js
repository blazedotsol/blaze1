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
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/health", (_req, res) => res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY }));

// Job Application endpoint
app.post("/api/generate-job-application", upload.fields([
  { name: 'userImage', maxCount: 1 },
  { name: 'templateImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const size = "1024x1024";
    const userImageFile = req.files?.userImage?.[0];
    const templateImageFile = req.files?.templateImage?.[0];
    
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

    // Job Application: Calculate template size (make it about 15% of the user image width)
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
    const compositeImage = await userImage
      .composite([{
        input: resizedTemplate,
        top: top,
        left: left,
        blend: 'over'
      }])
      .png()
      .toBuffer();

    // Use OpenAI for job application blending
    let finalImage = compositeImage;
    if (process.env.OPENAI_API_KEY) {
      try {
        const blendPrompt = "Composite the provided job application onto the uploaded photo so it looks naturally held by the figure. Use the uploaded photo exactly as it is — do not redraw or modify any part of it. Every pixel must remain identical except for blending in the paper. Preserve the photo's original aspect ratio, resolution, colors, and style.";
          
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
    console.error("Job application generation error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message = e?.message || "Job application generation failed";
    return res.status(status).json({
      error: message
    });
  }
});

// Face Mask endpoint
app.post("/api/generate-face-mask", upload.fields([
  { name: 'userImage', maxCount: 1 },
  { name: 'templateImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const size = "1024x1024";
    const userImageFile = req.files?.userImage?.[0];
    const templateImageFile = req.files?.templateImage?.[0];
    
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

    // Face Mask: resize to cover face area and position on face (larger for mask effect)
    const targetTemplateWidth = Math.floor(userWidth * 0.4);
    const targetTemplateHeight = Math.floor((templateHeight / templateWidth) * targetTemplateWidth);
    const left = Math.floor(userWidth * 0.3);
    const top = Math.floor(userHeight * 0.2);

    const resizedTemplate = await templateImage
      .resize(targetTemplateWidth, targetTemplateHeight)
      .png()
      .toBuffer();

    const compositeImage = await userImage
      .composite([{
        input: resizedTemplate,
        top: top,
        left: left,
        blend: 'multiply'
      }])
      .png()
      .toBuffer();

    // Use OpenAI for face mask blending
    let finalImage = compositeImage;
    if (process.env.OPENAI_API_KEY) {
      try {
        const blendPrompt = "Blend this face mask naturally with the figure/person face. Make it look like they're wearing the mask as a face covering. Don't change anything else about the photo.";
          
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
    console.error("Face mask generation error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message = e?.message || "Face mask generation failed";
    return res.status(status).json({
      error: message
    });
  }
});

app.listen(3001, () => console.log("API on :3001"));