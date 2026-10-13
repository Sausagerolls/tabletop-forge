// A hook below an early return is React error #310: the logged-in render runs
// more hooks than the logged-out one and React unmounts the page. The build
// never sees it and the page looks like a missing feature, not a crash.
import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import { readFileSync } from 'fs';
const P = Parser.extend(jsx());
const HOOK = /^use[A-Z]/;
let bad = 0;

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try { ast = P.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true }); }
  catch (e) { console.log(`${file}: PARSE ERROR ${e.message}`); continue; }

  const isComponent = (n) =>
    (n.id?.name && /^[A-Z]/.test(n.id.name)) ||
    (n.__name && /^[A-Z]/.test(n.__name));

  const check = (fn, name) => {
    const body = fn.body?.type === 'BlockStatement' ? fn.body.body : null;
    if (!body) return;
    // Top-level statements only: a return inside an if-block at the component's
    // own level is the early return that matters.
    let firstReturn = null;
    const scan = (stmts) => {
      for (const st of stmts) {
        if (st.type === 'ReturnStatement' && !firstReturn) firstReturn = st.loc.start.line;
        if (st.type === 'IfStatement' && !firstReturn) {
          const c = st.consequent;
          const inner = c.type === 'BlockStatement' ? c.body : [c];
          if (inner.some((x) => x.type === 'ReturnStatement')) firstReturn = st.loc.start.line;
        }
      }
    };
    scan(body);
    if (!firstReturn) return;

    // Any hook CALL after that line, anywhere in the component body.
    const hooks = [];
    const walk = (n) => {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && HOOK.test(n.callee.name)
          && n.loc.start.line > firstReturn) hooks.push([n.callee.name, n.loc.start.line]);
      for (const k of Object.keys(n)) {
        if (k === 'loc') continue;
        const v = n[k];
        if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c));
        else if (v && typeof v.type === 'string' && v !== fn.body) walk(v);
      }
    };
    // Only the component's own top-level statements — hooks inside a nested
    // component of its own are that component's business.
    for (const st of body) if (st.loc.start.line > firstReturn) walk(st);

    if (hooks.length) {
      bad++;
      console.log(`${file}  ${name}: early return at line ${firstReturn}, but ${hooks.length} hook(s) below it:`);
      for (const [h, l] of hooks.slice(0, 6)) console.log(`    line ${l}  ${h}()`);
    }
  };

  const top = (n, name) => {
    if (n.type === 'FunctionDeclaration' && n.id && /^[A-Z]/.test(n.id.name)) check(n, n.id.name);
    if ((n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression') && name && /^[A-Z]/.test(name)) check(n, name);
  };
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration') top(n);
    else if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.init) top(d.init, d.id.name);
    else if (n.type === 'ExportDefaultDeclaration' || n.type === 'ExportNamedDeclaration') {
      const d = n.declaration;
      if (!d) continue;
      if (d.type === 'FunctionDeclaration') top(d);
      else if (d.type === 'VariableDeclaration') for (const x of d.declarations) if (x.init) top(x.init, x.id.name);
    }
  }
}
console.log(bad ? `\n${bad} component(s) with hooks below an early return` : 'no hooks stranded below an early return');
process.exit(bad ? 1 : 0);
