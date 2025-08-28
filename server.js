import 'dotenv/config';
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, 'public')));
// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health check endpoint
app.get("/api/health", (_req, res) => {
  console.log("Health check called");
  res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY });
});

app.post("/api/generate-image", upload.fields([
  { name: 'userImage', maxCount: 1 },
  { name: 'templateImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { prompt, size = "1024x1024", type = "hold" } = req.body || {};
    console.log("Request file:", req.file ? "present" : "missing");
    
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
    
    const applicationImage = sharp(applicationImageBuffer);
    const { width: appWidth, height: appHeight } = await applicationImage.metadata();
    
    const maskImage = sharp(maskImageBuffer);
    const { width: maskWidth, height: maskHeight } = await maskImage.metadata();

    // Create left panel (hold application)
    const targetAppWidth = Math.floor(userWidth * 0.15);
    const targetAppHeight = Math.floor((appHeight / appWidth) * targetAppWidth);
    const appLeft = Math.floor(userWidth * 0.6);
    const appTop = Math.floor(userHeight * 0.4);

    const resizedApplication = await applicationImage
      .resize(targetAppWidth, targetAppHeight)
      .png()
      .toBuffer();

    const leftPanelImage = await userImage
      .composite([{
        input: resizedApplication,
        top: appTop,
        left: appLeft,
        blend: 'over'
      }])
      .png()
      .toBuffer();

    // Create right panel (wear mask)
    const targetMaskWidth = Math.floor(userWidth * 0.4);
    const targetMaskHeight = Math.floor((maskHeight / maskWidth) * targetMaskWidth);
    const maskLeft = Math.floor(userWidth * 0.3);
    const maskTop = Math.floor(userHeight * 0.2);

    const resizedMask = await maskImage
      .resize(targetMaskWidth, targetMaskHeight)
      .png()
      .toBuffer();

    const rightPanelImage = await userImage
      .composite([{
        input: resizedMask,
        top: maskTop,
        left: maskLeft,
        blend: 'multiply'
      }])
      .png()
      .toBuffer();

    // Combine both panels side by side
    const combinedImage = await sharp({
      create: {
        width: userWidth * 2,
        height: userHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      { input: leftPanelImage, top: 0, left: 0 },
      { input: rightPanelImage, top: 0, left: userWidth }
    ])
    .png()
    .toBuffer();

    // Optional: Use OpenAI for subtle blending (if needed)
    let finalImage = combinedImage;
    if (process.env.OPENAI_API_KEY && (promptLeft || promptRight)) {
      try {
        const blendPrompt = `Left panel: ${promptLeft || 'Hold application naturally'}. Right panel: ${promptRight || 'Wear mask naturally'}.`;
          
        const blendResult = await openai.images.edit({
          model: "dall-e-2",
          image: combinedImage,
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

// Keep the old single endpoints for backward compatibility
app.post("/api/generate-job-application", upload.single('userImage'), async (req, res) => {
  try {
    const userImageFile = req.file;
    
    if (!userImageFile) {
      return res.status(400).json({ error: "Missing user image" });
    }

    // Load template from server
    const templatePath = path.join(process.cwd(), 'public', 'image copy copy.png');
    const templateBuffer = fs.readFileSync(templatePath);
    
    // Process image with Sharp
    const userImage = sharp(userImageFile.buffer);
    const { width: userWidth, height: userHeight } = await userImage.metadata();
    
    const templateImage = sharp(templateBuffer);
    const { width: templateWidth, height: templateHeight } = await templateImage.metadata();
    
    const targetTemplateWidth = Math.floor(userWidth * 0.15);
    const targetTemplateHeight = Math.floor((templateHeight / templateWidth) * targetTemplateWidth);
    const left = Math.floor(userWidth * 0.6);
    const top = Math.floor(userHeight * 0.4);

    const resizedTemplate = await templateImage
      .resize(targetTemplateWidth, targetTemplateHeight)
      .png()
      .toBuffer();

    const compositeImage = await userImage
      .composite([{
        input: resizedTemplate,
        top: top,
        left: left,
        blend: 'over'
      }])
      .png()
      .toBuffer();

    const base64Result = compositeImage.toString('base64');
    return res.json({ imageBase64: base64Result });
  } catch (e) {
    console.error("Job application error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message = e?.message || "Job application generation failed";
    return res.status(status).json({ error: message });
  }
});

app.post("/api/generate-face-mask", upload.single('userImage'), async (req, res) => {
  try {
    const userImageFile = req.file;
    
    if (!userImageFile) {
      return res.status(400).json({ error: "Missing user image" });
    }

    // Load mask template from server
    const maskPath = path.join(process.cwd(), 'public', 'image copy copy.png');
    const maskBuffer = fs.readFileSync(maskPath);
    
    // Process image with Sharp
    const userImage = sharp(userImageFile.buffer);
    const { width: userWidth, height: userHeight } = await userImage.metadata();
    
    const maskImage = sharp(maskBuffer);
    const { width: maskWidth, height: maskHeight } = await maskImage.metadata();
    
    const targetMaskWidth = Math.floor(userWidth * 0.4);
    const targetMaskHeight = Math.floor((maskHeight / maskWidth) * targetMaskWidth);
    const left = Math.floor(userWidth * 0.3);
    const top = Math.floor(userHeight * 0.2);

    const resizedMask = await maskImage
      .resize(targetMaskWidth, targetMaskHeight)
      .png()
      .toBuffer();

    const compositeImage = await userImage
      .composite([{
        input: resizedMask,
        top: top,
        left: left,
        blend: 'multiply'
      }])
      .png()
      .toBuffer();

    // Optional AI enhancement
    let finalImage = compositeImage;
    if (process.env.OPENAI_API_KEY) {
      try {
        const blendResult = await openai.images.edit({
          model: "dall-e-2",
          image: compositeImage,
          prompt: "Blend this face mask naturally with the person's face. Make it look like they're wearing the mask. Don't change anything else.",
          size: "1024x1024",
          response_format: "b64_json",
        });
        finalImage = Buffer.from(blendResult.data[0].b64_json, "base64");
      } catch (aiError) {
        console.log("AI face mask blending failed:", aiError.message);
      }
    }

    const base64Result = finalImage.toString('base64');
    return res.json({ imageBase64: base64Result });
  } catch (e) {
    console.error("Face mask error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message = e?.message || "Face mask generation failed";
    return res.status(status).json({ error: message });
  }
});

app.listen(3001, () => console.log("API on :3001"));