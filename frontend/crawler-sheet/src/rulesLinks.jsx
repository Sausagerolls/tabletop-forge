import React from 'react';

// The World Dungeon rules site. Served next to the sheet (/rules/ beside /crawler/)
// on a Tabletop Forge server; VITE_RULES_URL points somewhere else if needed.
export const RULES_URL = import.meta.env.VITE_RULES_URL || '../rules/';
// Heading ids on the site are the heading text, lowercased, with dashes.
export const slug = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const rulesHref = (page, anchor) => `${RULES_URL}${page ? `${page}.html` : 'index.html'}${anchor ? `#${slug(anchor)}` : ''}`;

export function RulesLink({ page, anchor, children, light }) {
  return (
    <a className={`ruleslink${light ? ' light' : ''}`} href={rulesHref(page, anchor)} target="_blank" rel="noopener"
      onClick={(e) => e.stopPropagation()}>{children || 'Rules'} ↗</a>
  );
}
