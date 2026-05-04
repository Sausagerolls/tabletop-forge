import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = {
  dm: [
    {
      id: 'dm-sessions',
      title: 'Sessions',
      icon: '🏰',
      content: [
        {
          heading: 'Creating a Session',
          body: `Go to the TableTop Forge home page and click "New Session". Enter a name for your campaign and choose a GM password — share the session code and your password with no one else. Click "Create Session" to enter the GM view. Your session code (e.g. ABC123) is shown in the top-right corner of the GM panel; share this with your players.`,
        },
        {
          heading: 'Rejoining a Session',
          body: `Click "GM Login" on the home page, enter your session code and GM password, then click "Enter as Game Master".`,
        },
        {
          heading: 'Session Code',
          body: `The 6-character session code is displayed in the header of the GM panel. Players use this code to join the session. It never changes once created.`,
        },
      ],
    },
    {
      id: 'dm-maps',
      title: 'Maps',
      icon: '🗺️',
      content: [
        {
          heading: 'Uploading a Map',
          body: `In the GM panel, click the "Map" tab. Click "Upload Map" and select an image file (PNG, JPG, WEBP). The map will be uploaded to the server and displayed on the canvas for all connected players immediately.`,
        },
        {
          heading: 'Grid Size',
          body: `Use the "Grid Size" slider in the Map tab to set how many pixels equal one 5-ft square. Tokens snap to the grid when moved.`,
        },
        {
          heading: 'Map Scale',
          body: `Use the "Scale" slider in the Map tab to zoom the entire map canvas in or out. This affects all viewers.`,
        },
        {
          heading: 'Panning the Map',
          body: `Select the "Pan" tool (keyboard: V) then click and drag the map to scroll. Right-clicking and dragging also pans in any tool mode.`,
        },
      ],
    },
    {
      id: 'dm-tokens',
      title: 'Tokens & Creatures',
      icon: '🐉',
      content: [
        {
          heading: 'Adding Creatures to the Map',
          body: `In the "Creatures" tab of the GM panel, find a creature in the library or player character list. Click "Place" next to the creature to drop it onto the map at the centre of the current view.`,
        },
        {
          heading: 'Moving Tokens',
          body: `Select the "Move" tool (keyboard: M). Click a token to select it (highlighted gold ring), then drag it to a new position. The token snaps to the nearest grid square.`,
        },
        {
          heading: 'Selecting Multiple Tokens',
          body: `Hold Shift and click additional tokens to build a multi-selection, then drag any selected token to move them all together.`,
        },
        {
          heading: 'Removing a Token',
          body: `Select the token with the Move tool, then press Delete or Backspace. The token is removed from the map (the creature record is not deleted).`,
        },
        {
          heading: 'Token Size',
          body: `Creature size (Tiny, Small, Medium, Large, Huge, Gargantuan) determines token diameter. Set this in the creature's stat block under "Size".`,
        },
        {
          heading: 'Creature Library',
          body: `The "Creatures" tab shows all non-PC creatures. Click "New Creature" to open the creation form. Creatures are stored per-session and persist between GM logins.`,
        },
        {
          heading: 'Player Characters',
          body: `Player characters appear in a separate section of the Creatures tab. They are created by players when they join but the GM can also edit them.`,
        },
        {
          heading: 'Editing a Creature',
          body: `Click the pencil icon next to a creature in the panel to open its stat block editor. Changes are saved immediately and sync to players viewing that character.`,
        },
        {
          heading: 'HP Tracking',
          body: `Click a token on the map to open a quick HP editor. Type a number and press +/- to add or subtract HP, or type a value directly and press Enter to set it. HP bars appear below tokens.`,
        },
      ],
    },
    {
      id: 'dm-fog',
      title: 'Fog of War',
      icon: '🌫️',
      content: [
        {
          heading: 'What Is Fog of War?',
          body: `Fog of War (FOW) hides unexplored areas from players. The map is initially fully fogged. As you reveal areas or place light sources, fog lifts automatically for players.`,
        },
        {
          heading: 'Revealing Areas',
          body: `Select the "Reveal" tool (keyboard: R). Click and drag to paint a reveal polygon. The brushed area becomes permanently visible to players regardless of lighting.`,
        },
        {
          heading: 'Hiding Areas',
          body: `Select the "Hide" tool (keyboard: H). Paint over a previously revealed area to re-fog it.`,
        },
        {
          heading: 'Light Sources',
          body: `Placed light sources automatically illuminate fog for players based on their bright and dim radius. See the Lighting section for details.`,
        },
        {
          heading: 'Player Tokens Reveal',
          body: `Each player token has a vision radius set on the creature (Senses → Darkvision or passive Perception). Tokens reveal fog around themselves as they move.`,
        },
      ],
    },
    {
      id: 'dm-walls',
      title: 'Walls & Doors',
      icon: '🧱',
      content: [
        {
          heading: 'Drawing Walls',
          body: `Select the "Wall" tool (keyboard: W). Click to place points of the wall line; double-click or press Escape to finish the wall segment. Walls block both vision and movement.`,
        },
        {
          heading: 'Drawing Doors',
          body: `Select the "Door" tool (keyboard: D). Click to place a door segment. Doors appear as a thick line with a handle indicator. They block vision when closed.`,
        },
        {
          heading: 'Opening / Closing Doors',
          body: `Select the "Select" tool, then click a door to toggle it open or closed. Open doors allow vision and movement through them. Players can also click doors to open them if the GM has enabled this.`,
        },
        {
          heading: 'Erasing Walls',
          body: `Select the "Erase Wall" tool and click on an existing wall or door segment to delete it.`,
        },
      ],
    },
    {
      id: 'dm-lighting',
      title: 'Lighting',
      icon: '💡',
      content: [
        {
          heading: 'Placing a Light Source',
          body: `In the map toolbar, select the "Light" tool (keyboard: L). Click and drag on the map to place a light: drag direction sets which way the light faces, drag length sets the bright radius. Release to place.`,
        },
        {
          heading: 'Light Shapes',
          body: `Before placing, choose a shape in the GM panel's Light section:
• Circle — emits light in all directions (default)
• Cone — 60° arc in the facing direction
• Panel — 180° arc (half-plane) in the facing direction`,
        },
        {
          heading: 'Light Colour',
          body: `Pick a colour with the colour picker or click one of the preset swatches (white, warm yellow, orange, red, blue, green, purple, cyan). The tint affects how the illuminated area appears on the player's map.`,
        },
        {
          heading: 'Bright & Dim Radius',
          body: `Each light has a bright radius (full illumination, lifts fog completely) and a dim radius (partial illumination, lifts fog with reduced visibility). Both are set in grid squares.`,
        },
        {
          heading: 'Editing a Light',
          body: `Select the "Edit Light" tool (keyboard: J). Click on or near a light source to open the edit popup. Adjust Label, Bright Radius, Dim Radius, Direction (–180° to 180°), Spread (15°–360°), and Colour. Click "Save" to apply.`,
        },
        {
          heading: 'Deleting a Light',
          body: `Open the light edit popup as above and click "Delete Light".`,
        },
        {
          heading: 'Erasing a Light',
          body: `Select the "Erase Light" tool and click on an existing light source to remove it instantly.`,
        },
      ],
    },
    {
      id: 'dm-markers',
      title: 'Markers',
      icon: '📍',
      content: [
        {
          heading: 'Placing Markers',
          body: `Select the "Marker" tool (keyboard: K). Click on the map to place a numbered marker. Markers are visible to all players and useful for pointing out locations or initiative order.`,
        },
        {
          heading: 'Removing Markers',
          body: `Select the "Erase Marker" tool and click on a marker to remove it.`,
        },
      ],
    },
    {
      id: 'dm-combat',
      title: 'Combat & Initiative',
      icon: '⚔️',
      content: [
        {
          heading: 'Starting Combat',
          body: `In the "Combat" tab of the GM panel, click "Start Combat". An initiative tracker appears for all players.`,
        },
        {
          heading: 'Adding Creatures to Initiative',
          body: `Click the "+" next to each creature in the Creatures tab, or use the combat panel's "Add" button. Set each creature's initiative roll manually.`,
        },
        {
          heading: 'Advancing the Turn',
          body: `Click "Next Turn" to move to the next creature in initiative order. The active creature is highlighted on the map with a pulsing ring.`,
        },
        {
          heading: 'Ending Combat',
          body: `Click "End Combat" in the Combat tab to clear the initiative tracker.`,
        },
        {
          heading: 'Conditions',
          body: `Right-click a token (or use the creature detail panel) to add conditions such as Poisoned, Stunned, Prone, etc. Condition icons appear on the token.`,
        },
      ],
    },
    {
      id: 'dm-treasure',
      title: 'Treasure & Currency',
      icon: '💰',
      content: [
        {
          heading: 'Treasure Panel',
          body: `Open the "Treasure" tab in the GM panel. Here you can send items and currency to individual players.`,
        },
        {
          heading: 'Sending Currency',
          body: `In the Send Currency section, enter amounts of Gold Pieces (GP), Silver Pieces (SP), and/or Copper Pieces (CP). Then click a player's name button to send that currency to them. The amount is added to their character sheet and they receive an on-screen notification.`,
        },
        {
          heading: 'Sending Items',
          body: `Browse the item list in the Treasure tab and click "Send to [Player]" to add a found item to a player's inventory. The player sees a notification pop-up.`,
        },
      ],
    },
    {
      id: 'dm-sound',
      title: 'Sound & Ambience',
      icon: '🔊',
      content: [
        {
          heading: 'Playing Ambient Sound',
          body: `In the "Sound" tab of the GM panel, upload or select an audio file and click Play. The audio loops and plays for all connected players.`,
        },
        {
          heading: 'Volume Control',
          body: `Use the volume slider to adjust the global volume for all players simultaneously.`,
        },
        {
          heading: 'Stopping Sound',
          body: `Click "Stop" to silence all players. A new track can be started at any time.`,
        },
      ],
    },
    {
      id: 'dm-panel',
      title: 'GM Panel',
      icon: '🖥️',
      content: [
        {
          heading: 'Resizing the Panel',
          body: `The GM panel is on the right side of the screen. Hover over the thin divider between the map and the panel — it will glow gold. Click and drag left or right to resize the panel between 260 px and 600 px wide.`,
        },
        {
          heading: 'Tabs',
          body: `The GM panel has several tabs: Map (upload, grid, scale, lighting controls), Creatures (library and placed tokens), Combat (initiative tracker), Treasure (send items/currency), and Sound (ambient audio).`,
        },
        {
          heading: 'Actions Reference',
          body: `Click the "📖 Actions" button in the top-right toolbar to open a quick reference for D&D 5e Movement, Actions, Bonus Actions, and Reactions.`,
        },
      ],
    },
  ],
  player: [
    {
      id: 'player-joining',
      title: 'Joining a Session',
      icon: '🧙',
      content: [
        {
          heading: 'How to Join',
          body: `On the TableTop Forge home page, click "Join as Player". Enter your name and the 6-character session code given to you by your GM. Click "Next →".`,
        },
        {
          heading: 'Choosing a Character',
          body: `If you have played before, your existing characters are listed. Click one to enter with that character. To create a new character, click "+ Create New Character".`,
        },
        {
          heading: 'Creating a Character',
          body: `Fill in your character's name, race, class, hit points, armour class, and other details in the creation form. Upload an avatar image if you like. Click "Enter the Adventure" to join the session.`,
        },
      ],
    },
    {
      id: 'player-view',
      title: 'The Map',
      icon: '🗺️',
      content: [
        {
          heading: 'What You See',
          body: `Your view shows the game map. Fog of war hides areas you haven't explored. As your token moves, nearby areas are revealed automatically. The GM can also reveal areas directly.`,
        },
        {
          heading: 'Panning the Map',
          body: `Click and drag on the map (not on a token) to pan around. You can also use the Pan tool button.`,
        },
        {
          heading: 'Doors',
          body: `Doors appear as thick coloured lines on walls. Click on a door to open or close it (if the GM allows player interaction with doors).`,
        },
      ],
    },
    {
      id: 'player-character',
      title: 'Character Sheet',
      icon: '📜',
      content: [
        {
          heading: 'Viewing Your Stat Block',
          body: `Your stat block is displayed in the panel on the right. Scroll down to see all sections: ability scores, skills, saves, HP, AC, speed, senses, traits, actions, spells, inventory, and more.`,
        },
        {
          heading: 'Editing Your Character',
          body: `Click the pencil/edit icon next to your character name to open the full editing form. Changes save immediately and sync to the GM.`,
        },
        {
          heading: 'Hit Points',
          body: `Your current HP is shown prominently. The GM may update your HP during combat, and changes will appear automatically.`,
        },
        {
          heading: 'Printing Your Character',
          body: `Click the "🖨️ Print" button at the top of your stat block panel to open a print-friendly view. Use your browser's print dialog (Ctrl/Cmd+P) or save as PDF.`,
        },
      ],
    },
    {
      id: 'player-dice',
      title: 'Dice Rolling',
      icon: '🎲',
      content: [
        {
          heading: 'Opening the Dice Tray',
          body: `Click the "🎲 Dice" button in the bottom toolbar to open the dice roller.`,
        },
        {
          heading: 'Rolling Dice',
          body: `Click a die type (d4, d6, d8, d10, d12, d20, d100) to add it to your roll. You can add multiple dice of different types. Optionally add a modifier (+/– number). Click "Roll!" to roll.`,
        },
        {
          heading: 'Roll Results',
          body: `Results appear in the dice tray and are broadcast to the GM and other players in the session log.`,
        },
        {
          heading: 'Custom Rolls',
          body: `Type a dice expression (e.g. 2d6+3) in the text field and press Enter or click Roll.`,
        },
      ],
    },
    {
      id: 'player-inventory',
      title: 'Inventory & Equipment',
      icon: '🎒',
      content: [
        {
          heading: 'Viewing Inventory',
          body: `Scroll down your stat block to the Inventory section. All items granted by the GM or added during character creation appear here.`,
        },
        {
          heading: 'Receiving Items',
          body: `When the GM sends you an item, a notification pops up on screen. The item is automatically added to your inventory.`,
        },
        {
          heading: 'Currency',
          body: `Your Gold (GP), Silver (SP), and Copper (CP) are shown in the Currency section of your stat block. The GM can send currency to you during play; you'll see a 🪙 notification when this happens.`,
        },
        {
          heading: 'Weapons',
          body: `Weapons are listed in the Weapons section of your stat block with attack bonus and damage. Click a weapon row to roll the attack and damage dice.`,
        },
      ],
    },
    {
      id: 'player-spells',
      title: 'Spells',
      icon: '✨',
      content: [
        {
          heading: 'Viewing Spells',
          body: `Scroll down your stat block to the Spells section. Spells are grouped by level (cantrips, 1st level, 2nd level, etc.).`,
        },
        {
          heading: 'Spell Slots',
          body: `Your available spell slots are shown at the top of the Spells section. Click a slot to mark it as used (it turns dark). Click it again to restore it (after a long rest).`,
        },
        {
          heading: 'Casting Spells',
          body: `Click a spell name to expand its description, range, duration, and components. Click the dice icon next to a spell to roll its damage or healing.`,
        },
      ],
    },
    {
      id: 'player-actions',
      title: 'Actions Reference',
      icon: '📖',
      content: [
        {
          heading: 'Opening the Reference',
          body: `Click the "📖 Actions" button in the bottom-left of your screen to open the D&D 5e Actions Reference panel.`,
        },
        {
          heading: 'What Is Covered',
          body: `The reference covers all standard options for your turn:
• Movement — Crawl, Climb, Swim, Jump, Difficult Terrain, etc.
• Actions — Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use Object, Grapple, Shove, Improvise
• Bonus Actions — Two-Weapon Fighting, Cast a Spell (bonus action), Class Features
• Reactions — Opportunity Attack, Readied Action, Class Features`,
        },
        {
          heading: 'Closing the Reference',
          body: `Click the X button or click anywhere outside the panel to close it.`,
        },
      ],
    },
    {
      id: 'player-notifications',
      title: 'Notifications',
      icon: '🔔',
      content: [
        {
          heading: 'Treasure Notifications',
          body: `When the GM sends you an item or currency, a notification banner appears at the top of your screen listing what you received. It disappears automatically after 6 seconds.`,
        },
        {
          heading: 'Combat Notifications',
          body: `When it is your turn in combat, a "Your Turn!" indicator appears on screen.`,
        },
      ],
    },
  ],
};

function SectionNav({ sections, active, onSelect, label }) {
  return (
    <nav className="space-y-1">
      <div className="text-xs uppercase tracking-widest text-dnd-gold font-bold px-2 py-1">{label}</div>
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
            active === s.id
              ? 'bg-dnd-red text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <span>{s.icon}</span>
          <span>{s.title}</span>
        </button>
      ))}
    </nav>
  );
}

function Article({ section }) {
  if (!section) return null;
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-dnd-gold font-serif mb-1 flex items-center gap-2">
        <span>{section.icon}</span> {section.title}
      </h2>
      <div className="h-0.5 bg-dnd-gold/30 mb-6" />
      <div className="space-y-6">
        {section.content.map((block, i) => (
          <div key={i}>
            <h3 className="text-base font-semibold text-white mb-2">{block.heading}</h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{block.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Wiki() {
  const navigate = useNavigate();
  const allDM = SECTIONS.dm;
  const allPlayer = SECTIONS.player;
  const [activeId, setActiveId] = useState(allDM[0].id);
  const [perspective, setPerspective] = useState('dm');

  const currentSections = perspective === 'dm' ? allDM : allPlayer;
  const activeSection = currentSections.find((s) => s.id === activeId) || currentSections[0];

  function switchPerspective(p) {
    setPerspective(p);
    const sections = p === 'dm' ? allDM : allPlayer;
    setActiveId(sections[0].id);
  }

  return (
    <div className="min-h-screen bg-dnd-dark flex flex-col">
      {/* Top bar */}
      <header className="bg-dnd-panel border-b border-gray-700 px-4 py-3 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
        >
          ← Home
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <span className="text-dnd-gold font-bold font-serif text-lg">TableTop Forge Wiki</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => switchPerspective('dm')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              perspective === 'dm'
                ? 'bg-dnd-red text-white'
                : 'text-gray-400 hover:text-gray-200 border border-gray-600'
            }`}
          >
            🎲 GM Guide
          </button>
          <button
            onClick={() => switchPerspective('player')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              perspective === 'player'
                ? 'bg-dnd-red text-white'
                : 'text-gray-400 hover:text-gray-200 border border-gray-600'
            }`}
          >
            🧙 Player Guide
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-dnd-panel border-r border-gray-700 overflow-y-auto p-3">
          <SectionNav
            sections={currentSections}
            active={activeId}
            onSelect={setActiveId}
            label={perspective === 'dm' ? 'GM Guide' : 'Player Guide'}
          />
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Article section={activeSection} />
        </main>
      </div>
    </div>
  );
}
