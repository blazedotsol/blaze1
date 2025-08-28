import React, { useEffect, useRef, useState } from "react";

type Transform = {
  x: number;       // maskens senter (canvas coords)
  y: number;
  scale: number;   // 1 = original mask-størrelse
  rotation: number; // radianer
};

type Props = {
  baseImageFile: File | null;  // brukeropplasting
  maskImagePath?: string;      // path til mask-bildet
  onExport?: (dataUrl: string) => void;
};

export default function LocalFaceOverlay({ baseImageFile, maskImagePath = "/mask.png", onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [baseImg, setBaseImg] = useState<HTMLImageElement | null>(null);
  const [maskImg, setMaskImg] = useState<HTMLImageElement | null>(null);
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [opacity, setOpacity] = useState(0.95);
  const [shadow, setShadow] = useState(0.15); // 0–0.5 subtil "contact shadow"
  const [dragging, setDragging] = useState<null | { startX: number; startY: number; startTf: Transform }>(null);
  const [mode, setMode] = useState<"move" | "rotate" | "scale">("move");

  // Last inn base-bildet fra file
  useEffect(() => {
    if (!baseImageFile) { setBaseImg(null); return; }
    const url = URL.createObjectURL(baseImageFile);
    const img = new Image();
    img.onload = () => {
      setBaseImg(img);
      // Sentrer mask når base endres
      const c = canvasRef.current;
      if (c) setTf({ x: c.width / 2, y: c.height / 2, scale: 1, rotation: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [baseImageFile]);

  // Last inn mask
  useEffect(() => {
    const img = new Image();
    img.src = maskImagePath;
    img.onload = () => setMaskImg(img);
  }, [maskImagePath]);

  // Match canvas-størrelse til base-foto (innenfor en maks for ytelse)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !baseImg) return;
    const maxW = 1400; // juster om du vil
    const scale = baseImg.width > maxW ? maxW / baseImg.width : 1;
    c.width  = Math.round(baseImg.width * scale);
    c.height = Math.round(baseImg.height * scale);
    // Re-sentrer masken
    setTf((t) => ({ ...t, x: c.width / 2, y: c.height / 2 }));
  }, [baseImg]);

  // Tegn
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !baseImg) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Rens
    ctx.clearRect(0, 0, c.width, c.height);

    // Tegn base (fit til canvas allerede satt)
    ctx.drawImage(baseImg, 0, 0, c.width, c.height);

    if (!maskImg) return;

    // Beregn mask-størrelse (skaler ut fra mask.png sin naturlige bredde)
    const baseMaskW = maskImg.width;
    const baseMaskH = maskImg.height;
    const drawW = baseMaskW * tf.scale;
    const drawH = baseMaskH * tf.scale;

    // Subtil "contact shadow" under masken (fake 3D)
    if (shadow > 0) {
      ctx.save();
      ctx.translate(tf.x, tf.y);
      ctx.rotate(tf.rotation);
      ctx.globalAlpha = Math.min(shadow, 0.5);
      ctx.filter = "blur(6px)";
      ctx.drawImage(maskImg, -drawW / 2 + 3, -drawH / 2 + 6, drawW, drawH);
      ctx.restore();
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }

    // Tegn mask med ønsket opasitet
    ctx.save();
    ctx.translate(tf.x, tf.y);
    ctx.rotate(tf.rotation);
    ctx.globalAlpha = Math.min(Math.max(opacity, 0), 1);
    ctx.drawImage(maskImg, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    ctx.globalAlpha = 1;
  }, [baseImg, maskImg, tf, opacity, shadow]);

  // Pointer handling (drag / rotate / scale)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const getPos = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (!maskImg) return;
      c.setPointerCapture(e.pointerId);
      const p = getPos(e);
      setDragging({ startX: p.x, startY: p.y, startTf: { ...tf } });
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const p = getPos(e);
      if (mode === "move") {
        const dx = p.x - dragging.startX;
        const dy = p.y - dragging.startY;
        setTf({ ...dragging.startTf, x: dragging.startTf.x + dx, y: dragging.startTf.y + dy });
      } else if (mode === "rotate") {
        const a0 = Math.atan2(dragging.startY - dragging.startTf.y, dragging.startX - dragging.startTf.x);
        const a1 = Math.atan2(p.y - dragging.startTf.y, p.x - dragging.startTf.x);
        setTf({ ...dragging.startTf, rotation: dragging.startTf.rotation + (a1 - a0) });
      } else if (mode === "scale") {
        const d0 = Math.hypot(dragging.startX - dragging.startTf.x, dragging.startY - dragging.startTf.y);
        const d1 = Math.hypot(p.x - dragging.startTf.x, p.y - dragging.startTf.y);
        const s = d0 === 0 ? dragging.startTf.scale : dragging.startTf.scale * (d1 / d0);
        setTf({ ...dragging.startTf, scale: Math.min(Math.max(s, 0.1), 8) });
      }
    };

    const onUp = (e: PointerEvent) => {
      try { c.releasePointerCapture(e.pointerId); } catch {}
      setDragging(null);
    };

    const onWheel = (e: WheelEvent) => {
      // zoom med scroll (Ctrl/trackpad) – skaler rundt senter
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      setTf((t) => ({ ...t, scale: Math.min(Math.max(t.scale * delta, 0.1), 8) }));
    };

    c.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    c.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      c.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      c.removeEventListener("wheel", onWheel);
    };
  }, [dragging, tf, mode, maskImg]);

  const centerMask = () => {
    const c = canvasRef.current;
    if (!c) return;
    setTf({ x: c.width / 2, y: c.height / 2, scale: 1, rotation: 0 });
  };

  const exportImage = () => {
    const c = canvasRef.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    onExport?.(url);
    // Også trigge download direkte:
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobbed.png";
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center text-sm">
        <span className="font-mono uppercase">tool:</span>
        <div className="flex gap-1">
          <button onClick={() => setMode("move")}   className={"border px-2 py-1 " + (mode==="move"?"bg-black text-white":"")}>move</button>
          <button onClick={() => setMode("rotate")} className={"border px-2 py-1 " + (mode==="rotate"?"bg-black text-white":"")}>rotate</button>
          <button onClick={() => setMode("scale")}  className={"border px-2 py-1 " + (mode==="scale"?"bg-black text-white":"")}>scale</button>
          <button onClick={centerMask} className="border px-2 py-1">reset</button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <label className="font-mono text-xs uppercase">opacity</label>
        <input type="range" min={0.2} max={1} step={0.01} value={opacity}
               onChange={(e)=>setOpacity(parseFloat(e.target.value))}/>
        <span className="text-xs font-mono">{Math.round(opacity*100)}%</span>
      </div>

      <div className="flex gap-4 items-center">
        <label className="font-mono text-xs uppercase">contact shadow</label>
        <input type="range" min={0} max={0.5} step={0.01} value={shadow}
               onChange={(e)=>setShadow(parseFloat(e.target.value))}/>
      </div>

      <div className="border border-black bg-white inline-block">
        <canvas ref={canvasRef} className="max-w-full h-auto touch-none cursor-crosshair" />
      </div>

      <div className="flex gap-2">
        <button onClick={exportImage} className="border border-black px-3 py-2 hover:bg-black hover:text-white font-mono text-sm uppercase">
          download
        </button>
      </div>
    </div>
  );
}