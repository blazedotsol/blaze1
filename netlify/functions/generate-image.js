const OpenAI = require("openai");

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
    const { prompt, size = "1024x1024", userImage, type } = JSON.parse(event.body || '{}');
    
    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing prompt" })
      };
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" })
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    let out;
    
    if (type === "variation" && userImage) {
      // Create variations of the uploaded image
      out = await openai.images.createVariation({
        model: "dall-e-2",
        image: Buffer.from(userImage, 'base64'),
        n: 1,
        size,
        response_format: "b64_json",
      });
    } else {
      // Use regular generation with detailed prompt
      const enhancedPrompt = userImage 
        ? `${prompt} Style: realistic photo, high quality, detailed`
        : prompt;
        
      out = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        size,
        response_format: "b64_json",
      });
    }

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