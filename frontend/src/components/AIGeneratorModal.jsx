import React, { useState } from 'react';

const XIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const SpinnerIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 animate-spin"><path d="M12 2a10 10 0 0 1 10 10" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" opacity="0.3" /></svg>);
const SparkleIcon = () => (<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" /><path d="M5 17l.7 2.3 2.3.7-2.3.7L5 23l-.7-2.3L2 20l2.3-.7L5 17z" /></svg>);

const CR_VALUES = [
  '1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
];

const CREATURE_TYPES = [
  'Aberration','Beast','Celestial','Construct','Dragon','Elemental','Fey','Fiend',
  'Giant','Humanoid','Monstrosity','Ooze','Plant','Undead',
];

const SIZES = ['tiny','small','medium','large','huge','gargantuan'];
const SIZE_LABELS = { tiny:'Tiny',small:'Small',medium:'Medium',large:'Large',huge:'Huge',gargantuan:'Gargantuan' };

export default function AIGeneratorModal({ aiSettings, onGenerated, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    cr: '1',
    creature_type: 'Humanoid',
    size: 'medium',
    appearance: '',
    personality: '',
    environment: '',
    special_notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiSettings.provider,
          baseUrl: aiSettings.baseUrl,
          apiKey: aiSettings.apiKey || '',
          model: aiSettings.model || '',
          promptData: form,
        }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(res.status === 504 ? 'Request timed out — the model is taking too long. Try a simpler prompt or a faster model.' : `Server error ${res.status}: unexpected response`);
      }
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      onGenerated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold';
  const labelClass = 'block text-xs text-gray-400 mb-1';

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-700 shrink-0 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-dnd-gold text-base">AI Stat Block Generator</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Generating via{' '}
              <span className="text-gray-300">
                {aiSettings.provider === 'ollama' ? 'Ollama' : aiSettings.provider === 'openai' ? 'OpenAI' : 'LM Studio'}
              </span>
              {aiSettings.model ? ` · ${aiSettings.model}` : ''}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white p-1"><XIcon /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-900/30 rounded-lg p-3 border border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Name *</label>
            <input
              className={inputClass}
              placeholder="Ancient Shadow Drake"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>CR</label>
              <select className={inputClass} value={form.cr} onChange={(e) => setField('cr', e.target.value)}>
                {CR_VALUES.map((cr) => <option key={cr} value={cr}>{cr}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.creature_type} onChange={(e) => setField('creature_type', e.target.value)}>
                {CREATURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Size</label>
              <select className={inputClass} value={form.size} onChange={(e) => setField('size', e.target.value)}>
                {SIZES.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Appearance</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              placeholder="A hulking reptilian beast with obsidian scales and eyes that glow violet..."
              value={form.appearance}
              onChange={(e) => setField('appearance', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Personality / Behaviour</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              placeholder="Cunning and territorial, hunts by ambush, hoards shiny objects..."
              value={form.personality}
              onChange={(e) => setField('personality', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Environment / Habitat</label>
            <input
              className={inputClass}
              placeholder="Deep underground caverns, near lava flows"
              value={form.environment}
              onChange={(e) => setField('environment', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Special Notes</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              placeholder="Should have a fire breath attack and resistance to cold damage..."
              value={form.special_notes}
              onChange={(e) => setField('special_notes', e.target.value)}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700 shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            onClick={handleGenerate}
            className="flex-[2] bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <SpinnerIcon />
                Generating...
              </>
            ) : (
              <><SparkleIcon /> Generate Stat Block</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
