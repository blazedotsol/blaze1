const multiparty = require("multiparty");
const sharp = require("sharp");

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Only POST allowed" })
    };
  }

  try {
    // Parse multipart form data
    const form = new multiparty.Form();
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });
    
    const prompt = fields.prompt?.[0];
    const size = fields.size?.[0] || "1024x1024";
    const type = fields.type?.[0];
    const userImageFile = files.userImage?.[0];
    const templateImageFile = files.templateImage?.[0];
    
    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing prompt" })
      };
    }
    
    if (!userImageFile) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing user image" })
      };
    }
    
    if (!templateImageFile) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing template image" })
      }
    }

    // Read image buffers
    const fs = require('fs');
    const userImageBuffer = fs.readFileSync(userImageFile.path);
    const templateImageBuffer = fs.readFileSync(templateImageFile.path);

    // Get image dimensions
    const userImage = sharp(userImageBuffer);
    const { width: userWidth, height: userHeight } = await userImage.metadata();
    
    const templateImage = sharp(templateImageBuffer);
    const { width: templateWidth, height: templateHeight } = await templateImage.metadata();

    // Calculate template size (make it about 15% of the user image width)
    const targetTemplateWidth = Math.floor(userWidth * 0.15);
    const targetTemplateHeight = Math.floor((templateHeight / templateWidth) * targetTemplateWidth);

    // Position template in bottom-right area
    const left = Math.floor(userWidth * 0.6);
    const top = Math.floor(userHeight * 0.4);

    // Resize template to fit
    const resizedTemplate = await templateImage
      .resize(targetTemplateWidth, targetTemplateHeight)
      .png()
      .toBuffer();

    // Composite the images
    let compositeImage;
    if (type === "edit") {
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
    } else if (type === "overlay") {
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

    // Convert to base64
    const base64Result = compositeImage.toString('base64');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageBase64: base64Result })
    };
  } catch (e) {
    console.error("Image processing error:", e);
    const message = e?.message || "Image processing failed";
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: message })
    };
  }
};