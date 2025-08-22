const OpenAI = require("openai");
const multiparty = require("multiparty");

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
    
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
      }
    }
    // Use image editing with the user's image as base
    const out = await openai.images.edit({
      model: "dall-e-2",
      image: userImageBuffer,
      prompt,
      size,
      response_format: "b64_json",
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageBase64: out.data[0].b64_json })
    };
  } catch (e) {
    console.error("OpenAI error:", e);
    const status = e?.status || e?.response?.status || 500;
    const message = e?.message || e?.response?.data?.error?.message || "Image generation failed";
    return {
      statusCode: status,
      headers,
      body: JSON.stringify({ error: message })
    };
  }
};