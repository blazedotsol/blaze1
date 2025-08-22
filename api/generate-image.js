// api/generate-image.js
import sharp from "sharp";

function toBufferFromDataUrlOrBase64(s) {
  if (!s) throw new Error("Empty base64 string");
  const comma = s.indexOf(",");
  const raw = comma >= 0 ? s.slice(comma + 1) : s;
  return Buffer.from(raw, "base64");
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const {
      userImageBase64,
      templateImageBase64,
      templateUrl,
      mode = "edit",
      scalePctOfWidth = 0.15,
      posX = 0.60,
      posY = 0.40,
      opacity = 0.7,
    } = req.body;

    if (!userImageBase64) {
      return res.status(400).json({ error: "Missing userImageBase64" });
    }

    const userBuf = toBufferFromDataUrlOrBase64(userImageBase64);

    // Read base image dimensions
    const baseImg = sharp(userBuf);
    const baseMeta = await baseImg.metadata();
    if (!baseMeta.width || !baseMeta.height) {
      throw new Error("Could not read base image size");
    }

    // Get template image
    let templateBuf = null;
    if (templateImageBase64) {
      templateBuf = toBufferFromDataUrlOrBase64(templateImageBase64);
    } else if (templateUrl) {
      // Fetch from public URL
      const r = await fetch(templateUrl);
      if (!r.ok) throw new Error(`Failed to fetch templateUrl: ${r.status}`);
      const arr = await r.arrayBuffer();
      templateBuf = Buffer.from(arr);
    } else {
      throw new Error("Provide templateImageBase64 or templateUrl");
    }

    const tplMeta = await sharp(templateBuf).metadata();
    if (!tplMeta.width || !tplMeta.height) {
      throw new Error("Could not read template image size");
    }

    // Calculate size and position
    const targetW = Math.max(8, Math.round(baseMeta.width * scalePctOfWidth));
    const scale = targetW / tplMeta.width;
    const targetH = Math.max(8, Math.round(tplMeta.height * scale));

    const left = Math.round(baseMeta.width * posX - targetW / 2);
    const top = Math.round(baseMeta.height * posY - targetH / 2);

    // Prepare template (resize + optional alpha)
    let tpl = sharp(templateBuf).resize(targetW, targetH);
    if (mode === "overlay") {
      const withAlpha = await tpl.ensureAlpha(opacity).png().toBuffer();
      tpl = sharp(withAlpha);
    }

    const tplBuffer = await tpl.png().toBuffer();

    // Composite images
    const outBuffer = await sharp(userBuf)
      .composite([
        {
          input: tplBuffer,
          left,
          top,
        },
      ])
      .png()
      .toBuffer();

    // Return base64 data URL
    const base64 = outBuffer.toString("base64");
    res.status(200).json({ dataUrl: `data:image/png;base64,${base64}` });
  } catch (err) {
    console.error("generate-image error:", err);
    res.status(500).json({ error: err?.message || "Unexpected error" });
  }
}