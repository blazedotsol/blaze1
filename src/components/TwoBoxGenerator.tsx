import React, { useState } from 'react';

const TwoBoxGenerator: React.FC = () => {
  const [userImage, setUserImage] = useState<File | null>(null);
  const [applicationImage, setApplicationImage] = useState<File | null>(null); // copy.png
  const [maskImage, setMaskImage] = useState<File | null>(null);               // mask.png

  const [promptLeft, setPromptLeft] = useState(
    'Blend edges subtly, add natural shadows and lighting. Don\'t change the content, just improve the integration.'
  );
  const [promptRight, setPromptRight] = useState(
    'Blend this face mask naturally with the person\'s face. Make it look like they\'re wearing the mask. Don\'t change anything else.'
  );

  const [size, setSize] = useState('1024x1024');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultSrc, setResultSrc] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultSrc(null);

    if (!userImage || !applicationImage || !maskImage) {
      setError('Please select a user image, the job application (copy.png), and the mask (mask.png).');
      return;
    }

    try {
      setBusy(true);
      const fd = new FormData();
      fd.append('userImage', userImage);

      // IMPORTANT: send TWO entries under the SAME field name 'templateImage'
      // Index [0] = left panel (hold application)
      // Index [1] = right panel (wear mask)
      fd.append('templateImage', applicationImage, applicationImage.name || 'copy.png');
      fd.append('templateImage', maskImage, maskImage.name || 'mask.png');

      // Two distinct prompts & types; same logic as your working single-box
      fd.append('promptLeft', promptLeft);
      fd.append('promptRight', promptRight);
      fd.append('typeLeft', 'edit');     // left = hold (your "edit" logic)
      fd.append('typeRight', 'overlay'); // right = wear (your "overlay" logic)
      fd.append('size', size);

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      if (!data?.imageBase64) throw new Error('No imageBase64 returned by server.');

      setResultSrc(`data:image/png;base64,${data.imageBase64}`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-bold mb-3">Two-Box Generator</h2>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">User Image</label>
            <input type="file" accept="image/*" onChange={e => setUserImage(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Left (copy.png)</label>
            <input type="file" accept="image/*" onChange={e => setApplicationImage(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Right (mask.png)</label>
            <input type="file" accept="image/*" onChange={e => setMaskImage(e.target.files?.[0] || null)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Left Prompt (hold application)</label>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={2}
            value={promptLeft}
            onChange={e => setPromptLeft(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Right Prompt (wear mask)</label>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={2}
            value={promptRight}
            onChange={e => setPromptRight(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm">Size</label>
          <select className="border rounded p-1 text-sm" value={size} onChange={e => setSize(e.target.value)}>
            <option>1024x1024</option>
            <option>512x512</option>
            <option>256x256</option>
          </select>

          <button
            type="submit"
            disabled={busy}
            className="ml-auto bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {busy ? 'Generating…' : 'Generate 2 Boxes'}
          </button>
        </div>
      </form>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {resultSrc && (
        <div className="mt-4">
          <img src={resultSrc} alt="two-panel result" className="w-full border rounded" />
          <p className="text-xs text-gray-500 mt-2">
            Left = <code>typeLeft=edit</code> (hold application) • Right = <code>typeRight=overlay</code> (wear mask)
          </p>
        </div>
      )}
    </div>
  );
};

export default TwoBoxGenerator;