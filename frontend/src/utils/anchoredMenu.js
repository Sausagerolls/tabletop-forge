// Positioning for menus that open at the pointer — right-click menus and the
// like.
//
// THE PROBLEM THIS REPLACES
// ────────────────────────
// Every such menu used to clamp itself with a hard-coded guess at its own
// height:
//
//     const top = Math.min(menu.y, window.innerHeight - 240);
//
// which is only correct while the menu happens to be 240px tall. The token
// menu had grown well past that, so a right-click near the bottom of the
// screen put its lower half below the fold with no way to reach it. The guess
// also goes stale silently: adding one entry to a menu re-breaks it, and
// nothing fails until someone right-clicks in the wrong place.
//
// So nothing here guesses. The menu is measured after it renders and placed
// from its real size.
//
// WHAT IT DOES
// ────────────
//   * Opens at the pointer when there is room.
//   * If it would run off the bottom, it slides UP until it fits — the whole
//     menu stays on screen and the pointer stays inside it.
//   * If it is taller than the viewport, so sliding up would push it off the
//     TOP, it pins to the top margin and scrolls within itself instead.
//   * Same treatment horizontally, so a right-click near the right edge does
//     not clip the menu's width.
//
// It re-measures when the menu's own content changes size, which matters
// because these menus have expanding sections — opening "send to map" makes
// the token menu taller, and a menu that fitted a moment ago may not any more.
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

// Breathing room between the menu and the edge of the window.
export const MENU_MARGIN = 8;

/**
 * @param  {number} x        pointer position that opened the menu
 * @param  {number} y
 * @param  {object} [opts]   { margin }
 * @return {{ ref, style, className }} spread onto the menu's root element
 */
export function useAnchoredMenu(x, y, opts = {}) {
  const margin = opts.margin ?? MENU_MARGIN;
  const ref = useRef(null);
  // Hidden for the first paint only: the measurement below runs in a layout
  // effect, before the browser paints, so the menu is never SEEN at the
  // unplaced position — but it would be measured at zero size if we let it
  // render with no dimensions at all, hence visibility rather than display.
  const [style, setStyle] = useState({ left: x, top: y, visibility: 'hidden' });
  // Whether the menu is actually too tall for the screen. Only then does it
  // get a scrollbar — see the note on the return value for why that matters.
  const [needsScroll, setNeedsScroll] = useState(false);

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const room = Math.max(80, vh - margin * 2);

    // scrollHeight is the FULL content height regardless of any max-height
    // already applied, so measuring never has to disturb the element's own
    // styles — which is what keeps the ResizeObserver below from oscillating.
    const borders = el.offsetHeight - el.clientHeight;
    const wanted = el.scrollHeight + (Number.isFinite(borders) ? borders : 0);
    const height = Math.min(wanted, room);
    const width = el.offsetWidth;

    // Vertical: prefer the pointer, slide up to fit, pin at the top and let it
    // scroll when it cannot fit at all.
    let top = y;
    if (top + height > vh - margin) top = vh - margin - height;
    if (top < margin) top = margin;

    // Horizontal: same idea, but flip to the pointer's left when there is more
    // room that side — a menu that merely clamps can end up covering the thing
    // that was right-clicked.
    let left = x;
    if (left + width > vw - margin) {
      const flipped = x - width;
      left = flipped >= margin ? flipped : Math.max(margin, vw - margin - width);
    }

    // Parenthesised deliberately: `prev === wanted > room` parses as
    // `(prev === wanted) > room`, which is nonsense.
    const wantsScroll = wanted > room;
    setNeedsScroll((prev) => (prev === wantsScroll ? prev : wantsScroll));

    const next = {
      left: Math.round(left),
      top: Math.round(top),
      maxHeight: room,
      visibility: 'visible',
    };
    // Only commit a genuine change. The ResizeObserver fires in response to
    // our own max-height, so an unguarded set here would re-render forever.
    setStyle((prev) => (
      prev.left === next.left && prev.top === next.top
        && prev.maxHeight === next.maxHeight && prev.visibility === next.visibility
        ? prev : next
    ));
  }, [x, y, margin]);

  useLayoutEffect(() => {
    place();
    window.addEventListener('resize', place);
    // Menus here have collapsible sections; re-place when one opens or closes
    // so a menu that just grew still fits.
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && ref.current) {
      ro = new ResizeObserver(place);
      ro.observe(ref.current);
    }
    return () => {
      window.removeEventListener('resize', place);
      if (ro) ro.disconnect();
    };
  }, [place]);

  // The scrollbar is applied ONLY when the menu is genuinely too tall.
  //
  // `overflow-y: auto` does not leave the other axis alone: per spec, when one
  // axis is not `visible` the other computes to `auto` as well. So a menu that
  // fitted the screen perfectly well still clipped HORIZONTALLY — and this
  // menu's submenus are `absolute left-full`, sitting entirely outside its
  // right edge. They were being swallowed, reachable only by scrolling the
  // menu sideways.
  //
  // When the menu does fit, nothing is clipped and the submenus fly out freely.
  // When it genuinely overflows, scrolling is still the lesser evil: the
  // entries have to be reachable somehow.
  return {
    ref,
    style,
    className: needsScroll ? 'overflow-y-auto overscroll-contain' : '',
  };
}

/**
 * The same behaviour as a plain element, for menus rendered inline where a
 * hook cannot legally be called — a menu built inside an IIFE in JSX, for
 * instance. Written with createElement so this stays a .js module.
 *
 * Any extra props (onClick, id, …) pass through to the element.
 */
export function AnchoredPanel({ x, y, className = '', children, ...rest }) {
  const anchored = useAnchoredMenu(x, y);
  return React.createElement(
    'div',
    {
      ...rest,
      ref: anchored.ref,
      className: `fixed ${className} ${anchored.className}`,
      style: { ...anchored.style, ...(rest.style || {}) },
    },
    children,
  );
}

/**
 * A submenu that flies out from a row of a larger menu.
 *
 * These are positioned `absolute left-full top-0`, which aligns them with the
 * row that opened them — fine in the middle of the screen, and off the bottom
 * edge for any row in the lower part of a tall menu.
 *
 * This keeps the horizontal placement (it belongs beside its row) and corrects
 * only the vertical: it slides UP by however much it overhangs, and when it is
 * taller than the screen it pins near the top and scrolls within itself. Same
 * rules as useAnchoredMenu, but relative to the parent rather than the pointer,
 * because a submenu that jumped to the pointer would lose its association with
 * the row it came from.
 */
export function Submenu({ className = '', children, ...rest }) {
  const ref = useRef(null);
  const [fit, setFit] = useState({ offset: 0, maxHeight: null });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      // Measured from the ROW, not from the submenu itself.
      //
      // Deriving the natural top from the submenu's own rect and subtracting
      // the offset already applied looks equivalent and is not: it makes the
      // input depend on the output, and any disagreement between the two — a
      // layout that has not settled, a rect read a frame early — sends it into
      // an infinite update loop. React caps that at fifty renders and throws.
      //
      // The row is the submenu's positioning parent and is never moved by this
      // correction, so its top IS the natural top, with no feedback at all.
      const host = el.offsetParent || el.parentElement;
      const naturalTop = host
        ? host.getBoundingClientRect().top
        : el.getBoundingClientRect().top - fit.offset;
      const wanted = el.scrollHeight;
      const vh = typeof window === 'undefined' ? 900 : (Number(window.innerHeight) || 900);
      const room = Math.max(120, vh - MENU_MARGIN * 2);

      let offset = 0;
      let maxHeight = null;
      if (wanted > room) {
        // Taller than the screen: pin to the top margin and scroll.
        offset = -(naturalTop - MENU_MARGIN);
        maxHeight = room;
      } else {
        const over = (naturalTop + wanted) - (vh - MENU_MARGIN);
        if (over > 0) offset = -over;
      }
      setFit((prev) => (
        prev.offset === offset && prev.maxHeight === maxHeight ? prev : { offset, maxHeight }
      ));
    };

    measure();
    window.addEventListener('resize', measure);
    // Submenus whose contents load or change size after opening — a map list,
    // a spawn-point list — need re-fitting when that happens.
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
    // Deliberately NOT depending on `fit`: the measurement no longer reads
    // anything this effect writes, so re-running on its own result would only
    // risk the loop it was written to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = {
    top: fit.offset,
    ...(fit.maxHeight ? { maxHeight: fit.maxHeight, overflowY: 'auto' } : {}),
    ...(rest.style || {}),
  };
  return React.createElement(
    'div',
    {
      ...rest,
      ref,
      className: `absolute left-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 z-10 overscroll-contain ${className}`,
      style,
    },
    children,
  );
}
