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
    const { prompt, size = "1024x1024", type } = req.body || {};
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

    // Calculate template size (make it about 15% of the user image width)
    const targetTemplateWidth = Math.floor(userWidth * 0.15);
    const targetTemplateHeight = Math.floor((templateHeight / templateWidth) * targetTemplateWidth);

    // Position template in bottom-right area (where a character might hold it)
    const left = Math.floor(userWidth * 0.6);
    const top = Math.floor(userHeight * 0.4);

    // Resize template to fit
    let resizedTemplate;
    let compositeLeft, compositeTop;
    
    if (type === "overlay") {
      // For mask overlay - resize to cover face area and position on face
      const maskWidth = Math.floor(userWidth * 0.3); // Smaller for face coverage
      const maskHeight = Math.floor((templateHeight / templateWidth) * maskWidth);
      
      resizedTemplate = await templateImage
        .resize(maskWidth, maskHeight)
        .png()
        .toBuffer();
        
      // Position on face area (center-top area)
      compositeLeft = Math.floor(userWidth * 0.35);
      compositeTop = Math.floor(userHeight * 0.2);
    } else {
      // Original job application logic
      resizedTemplate = await templateImage
        .resize(targetTemplateWidth, targetTemplateHeight)
        .png()
        .toBuffer();
        
      compositeLeft = left;
      compositeTop = top;
    }

    // Composite the images
    let compositeImage;
    if (type === "overlay") {
      // Place mask directly on face with blend mode for natural look
      compositeImage = await userImage
        .composite([{
          input: resizedTemplate,
          top: compositeTop,
          left: compositeLeft,
          blend: 'multiply' // Better blending for mask effect
        }])
        .png()
        .toBuffer();
    } else if (type === "edit") {
      // Place template as if character is holding it
      compositeImage = await userImage
        .composite([{
          input: resizedTemplate,
          top: compositeTop,
          left: compositeLeft,
          blend: 'over'
        }])
        .png()
        .toBuffer();
    } else {
      // Default: just place template
      compositeImage = await userImage
        .composite([{
          input: resizedTemplate,
          top: compositeTop,
          left: compositeLeft,
          blend: 'over'
        }])
        .png()
        .toBuffer();
    }

    // Optional: Use OpenAI for subtle blending/shadows (only if needed)
    let finalImage = compositeImage;
    if (process.env.OPENAI_API_KEY && (type === "edit" || type === "overlay")) {
      try {
        if (type === "overlay") {
          // Create a mask for the overlay region using gpt-image-1
          const resizedTemplateMetadata = await sharp(resizedTemplate).metadata();
          
          // Build a mask that is transparent over the template region and opaque elsewhere
          const mask = await sharp({
            create: {
              width: userWidth, 
              height: userHeight, 
              channels: 4, 
              background: { r: 0, g: 0, b: 0, alpha: 1 }
            }
          })
          .composite([{
            input: await sharp({
              create: {
                width: Math.ceil(resizedTemplateMetadata.width),
                height: Math.ceil(resizedTemplateMetadata.height),
                channels: 4, 
                background: { r: 0, g: 0, b: 0, alpha: 0 }
              }
            }).png().toBuffer(),
            top: compositeTop, 
            left: compositeLeft
          }])
          .png().toBuffer();

          // Use gpt-image-1 with mask for precise overlay blending
          const blendResult = await openai.images.edit({
            model: 'gpt-image-1',
            image: compositeImage,
            mask: mask,
            prompt: "Blend the overlay naturally to look like a face mask. Match skin lighting and add realistic contact shadows. Keep everything else exactly the same.",
            size: size || '1024x1024',
            response_format: 'b64_json',
          });
          finalImage = Buffer.from(blendResult.data[0].b64_json, 'base64');
        } else {
          // For job application (non-overlay), use the old method
          const blendResult = await openai.images.edit({
            model: "dall-e-2",
            image: compositeImage,
            prompt: "Blend edges subtly, add natural shadows and lighting. Don't change the content, just improve the integration.",
            size,
            response_format: "b64_json",
          });
          finalImage = Buffer.from(blendResult.data[0].b64_json, "base64");
        }
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