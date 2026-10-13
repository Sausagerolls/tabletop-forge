// Every identifier a component reads but never declares, imports or receives.
// esbuild happily ships these as bare globals; the browser throws on render.
import { parse } from 'acorn';
import jsx from 'acorn-jsx';
import { readFileSync } from 'fs';

const P = parse.bind(null);
const Parser = (await import('acorn')).Parser.extend(jsx());
const BROWSER = new Set(['window','document','console','navigator','localStorage','sessionStorage','fetch','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame','Math','JSON','Object','Array','String','Number','Boolean','Date','Promise','Map','Set','WeakMap','Error','RegExp','isNaN','parseInt','parseFloat','encodeURIComponent','decodeURIComponent','Image','FormData','Blob','File','FileReader','URL','AbortController','CustomEvent','Event','alert','confirm','prompt','performance','crypto','structuredClone','Intl','Infinity','NaN','undefined','globalThis','process','WebSocket','ResizeObserver','IntersectionObserver','MutationObserver','TextEncoder','TextDecoder','atob','btoa','queueMicrotask','HTMLElement','Node','Audio','AudioContext','speechSynthesis','matchMedia','getComputedStyle','Symbol','Proxy','Reflect','BigInt','Uint8Array','Float32Array','ArrayBuffer','DataView','Int32Array','Uint16Array','Uint32Array','Int16Array','Int8Array','Uint8ClampedArray','Float64Array','WeakSet','Function','TypeError','RangeError','DOMParser','XMLSerializer','SVGElement','Worker','Notification','history','location','screen','top','parent','self','frames','caches','indexedDB']);

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try { ast = Parser.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true }); }
  catch (e) { console.log(`${file}: PARSE ERROR ${e.message}`); continue; }

  const declared = new Set(BROWSER);
  const read = new Map();

  // Collect every binding name anywhere in the file, and every identifier read.
  // Scope-insensitive on purpose: a name declared in ANY scope is not the bug
  // we are hunting, and this pass must not cry wolf.
  const walk = (n, parent) => {
    if (!n || typeof n.type !== 'string') return;
    switch (n.type) {
      case 'VariableDeclarator': collectPattern(n.id); break;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression':
        if (n.id) declared.add(n.id.name);
        n.params.forEach(collectPattern); break;
      case 'ClassDeclaration': if (n.id) declared.add(n.id.name); break;
      case 'ImportSpecifier': case 'ImportDefaultSpecifier': case 'ImportNamespaceSpecifier':
        declared.add(n.local.name); break;
      case 'CatchClause': if (n.param) collectPattern(n.param); break;
      case 'LabeledStatement': declared.add(n.label.name); break;
      case 'Identifier': {
        const p = parent;
        if (!p) break;
        // Not a read: property keys, member access, labels, JSX attribute names.
        if (p.type === 'MemberExpression' && p.property === n && !p.computed) break;
        if (p.type === 'Property' && p.key === n && !p.computed) break;
        if (p.type === 'JSXAttribute' && p.name === n) break;
        if (p.type === 'MethodDefinition' && p.key === n) break;
        if (/^(Break|Continue|Labeled)Statement$/.test(p.type)) break;
        if (!read.has(n.name)) read.set(n.name, n.loc.start.line);
        break;
      }
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'type') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, n));
      else if (v && typeof v.type === 'string') walk(v, n);
    }
  };
  function collectPattern(p) {
    if (!p) return;
    if (p.type === 'Identifier') declared.add(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach((x) => collectPattern(x.value || x.argument));
    else if (p.type === 'ArrayPattern') p.elements.forEach(collectPattern);
    else if (p.type === 'AssignmentPattern') collectPattern(p.left);
    else if (p.type === 'RestElement') collectPattern(p.argument);
  }
  walk(ast, null);

  const bad = [...read].filter(([name]) => !declared.has(name) && !/^[A-Z0-9_]+$/.test(name));
  if (bad.length) for (const [name, line] of bad) console.log(`${file}:${line}  ${name}`);
}
