import React, { useState } from 'react';

const XIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);

const SECTIONS = [
  {
    title: 'Movement',
    items: [
      { name: 'Move', desc: 'Cost: 5ft per 5ft' },
      { name: 'Climb', desc: 'Cost: 10ft per 5ft' },
      { name: 'Swim', desc: 'Cost: 10ft per 5ft' },
      { name: 'Drop Prone', desc: 'Cost: 0ft' },
      { name: 'Crawl', desc: 'Cost: 10ft per 5ft' },
      { name: 'Stand Up', desc: 'Cost: half your speed' },
      { name: 'High Jump', desc: 'Cost: 10ft, clears 3 + STR mod ft' },
      { name: 'Long Jump', desc: 'Cost: 10ft, covers STR score ft (running), half (standing)' },
      { name: 'Difficult Terrain', desc: 'Modifier: costs 2ft per 1ft' },
      { name: 'Grapple Move', desc: 'Modifier: speed halved' },
      { name: 'Improvise', desc: 'Any movement stunt not on this list' },
    ],
  },
  {
    title: 'Actions',
    items: [
      { name: 'Attack', desc: 'Melee or ranged attack' },
      { name: 'Grapple', desc: 'Special melee attack' },
      { name: 'Shove', desc: 'Special melee attack' },
      { name: 'Cast a Spell', desc: 'Cast time of 1 action' },
      { name: 'Dash', desc: 'Extra movement equal to your speed' },
      { name: 'Disengage', desc: 'Movement does not provoke opportunity attacks' },
      { name: 'Dodge', desc: 'Attacks against you have disadvantage (requires sight)' },
      { name: 'Help', desc: 'Give an ally advantage on an ability check or attack' },
      { name: 'Hide', desc: 'Make a Dexterity (Stealth) check' },
      { name: 'Ready', desc: 'Choose a trigger and a reaction for it' },
      { name: 'Search', desc: 'Make a Perception or Investigation check' },
      { name: 'Use an Object', desc: 'Draw/stow a second item, use a magic item, etc.' },
      { name: 'Use Class Feature', desc: 'Some features use actions' },
      { name: 'Improvise', desc: 'Any action not on this list' },
    ],
  },
  {
    title: 'Bonus Actions',
    items: [
      { name: 'Offhand Attack', desc: 'Use with the Attack action' },
      { name: 'Cast a Spell', desc: 'Cast time of 1 bonus action' },
      { name: 'Use Class Feature', desc: 'Some features use bonus actions' },
    ],
  },
  {
    title: 'Reactions',
    items: [
      { name: 'Opportunity Attack', desc: 'Enemy leaves your reach' },
      { name: 'Readied Action', desc: 'Part of your Ready action' },
      { name: 'Cast a Spell', desc: 'Cast time of 1 reaction' },
      { name: 'Use Class Feature', desc: 'Some features use reactions' },
    ],
  },
];

function Section({ title, items }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-750 text-left"
      >
        <span className="font-semibold text-dnd-gold text-sm">{title}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="divide-y divide-gray-700/50">
          {items.map((item) => (
            <div key={item.name} className="px-3 py-1.5 flex gap-3 items-baseline">
              <span className="text-xs font-semibold text-gray-200 w-36 shrink-0">{item.name}</span>
              <span className="text-xs text-gray-400">{item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActionsReference({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-lg flex flex-col shadow-2xl"
        style={{ maxHeight: '75vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h3 className="text-dnd-gold font-semibold">D&D 5e Actions Reference</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><XIcon /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {SECTIONS.map(s => <Section key={s.title} title={s.title} items={s.items} />)}
        </div>
      </div>
    </div>
  );
}
