const API_BASE = import.meta.env.VITE_API_BASE || "";

export const generateImage = async (prompt: string) => {
  try {
    const apiUrl = `/.netlify/functions/generate-image`;
    
    console.log('Calling API:', apiUrl);
    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, size: "1024x1024" }),
    });
    
    console.log('API Response status:', r.status);
  
    const ct = r.headers.get("content-type") || "";
    let payload: any = null;
    try {
      payload = ct.includes("application/json") ? await r.json() : { raw: await r.text() };
    } catch {
      // ignorér parse-feil
    }

    if (!r.ok) {
      const msg =
        `HTTP ${r.status} ${r.statusText}` +
        (payload?.error ? ` – ${payload.error}` : payload?.raw ? ` – ${payload.raw}` : "");
      throw new Error(msg);
    }

    const b64 = payload?.imageBase64 || payload?.image;
    if (!b64) throw new Error("Tomt svar fra API: mangler imageBase64");
    return b64;
  } catch (error: any) {
    if (error.message?.includes('fetch')) {
      throw new Error("Image generation service is temporarily unavailable. Please try again later.");
    }
    throw error;
  }
};

export const checkHealth = async () => {
  try {
    const r = await fetch(`/.netlify/functions/hello`);
    return r.ok;
  } catch {
    return false;
  }
};