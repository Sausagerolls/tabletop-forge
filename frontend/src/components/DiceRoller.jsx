import React, { useState } from 'react';
import socket from '../socket.js';

const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

const DICE_ICONS = {
  d4: '▲',
  d6: '⬡',
  d8: '◆',
  d10: '⬟',
  d12: '⬠',
  d20: '⬣',
  d100: '%',
};

export default function DiceRoller({ rolls, isPlayer }) {
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [selectedDie, setSelectedDie] = useState('d20');

  function rollDie(dice) {
    socket.emit('roll_dice', { dice, count, modifier });
  }

  return (
    <div className="space-y-3">
      {/* Quick roll buttons */}
      <div className="grid grid-cols-7 gap-1">
        {DICE.map((d) => (
          <button
            key={d}
            onClick={() => rollDie(d)}
            className="flex flex-col items-center justify-center bg-gray-700 hover:bg-dnd-red active:bg-red-800 rounded-lg py-2 px-1 transition-colors"
          >
            <span className="text-lg leading-none text-dnd-gold">{DICE_ICONS[d]}</span>
            <span className="text-xs text-gray-300 mt-0.5">{d}</span>
          </button>
        ))}
      </div>

      {/* Count + modifier */}
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400">Count:</label>
        <input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
          className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-center"
        />
        <label className="text-gray-400">Mod:</label>
        <input
          type="number"
          min={-20}
          max={20}
          value={modifier}
          onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
          className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-center"
        />
        <button
          onClick={() => rollDie(selectedDie)}
          className="flex-1 bg-dnd-red hover:bg-red-700 text-white rounded px-3 py-1 text-sm font-semibold"
        >
          Roll {count}{selectedDie}{modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}
        </button>
      </div>

      {/* Die selector for custom roll */}
      <div className="flex gap-1 flex-wrap">
        {DICE.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDie(d)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              selectedDie === d ? 'bg-dnd-gold text-gray-900 font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

// Overlay component for floating dice results
export function DiceRollOverlay({ rolls }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 pointer-events-none max-w-xs">
      {rolls.map((roll) => (
        <div
          key={roll.id}
          className="dice-roll-anim bg-gray-900/95 border border-dnd-gold rounded-xl p-3 shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎲</span>
            <div>
              <div className="text-xs text-gray-400">
                {roll.label && <span className="text-purple-300 font-medium">{roll.label} — </span>}
                <span className={roll.role === 'dm' ? 'text-dnd-gold' : 'text-blue-400'}>
                  {roll.userName}
                </span>
                {' rolls '}
                <span className="text-gray-200 font-mono">{roll.count > 1 ? roll.count : ''}{roll.dice}{roll.modifier !== 0 ? (roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier) : ''}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-dnd-gold">{roll.total}</span>
                {roll.rolls.length > 1 && (
                  <span className="text-xs text-gray-400">({roll.rolls.join(', ')})</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
