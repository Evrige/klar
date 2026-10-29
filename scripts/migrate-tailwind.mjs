// One-time migration from the preserved reference stylesheet. Never run in production.
import fs from 'node:fs';
import postcss from 'postcss';

const reference = '.reference-cache/tailwind-migration/styles-before.css';
if (!fs.existsSync(reference)) throw new Error('Missing local migration reference');
const root = postcss.parse(fs.readFileSync(reference, 'utf8'));
const named = {
  display: {flex:'flex',grid:'grid',block:'block',none:'hidden','inline-flex':'inline-flex',inline:'inline','inline-block':'inline-block'},
  position: {relative:'relative',absolute:'absolute',fixed:'fixed',sticky:'sticky',static:'static'},
  'align-items': {center:'items-center','flex-start':'items-start','flex-end':'items-end',stretch:'items-stretch',baseline:'items-baseline'},
  'justify-content': {center:'justify-center','space-between':'justify-between','flex-start':'justify-start','flex-end':'justify-end'},
  'flex-direction': {column:'flex-col',row:'flex-row'},
  'flex-wrap': {wrap:'flex-wrap',nowrap:'flex-nowrap'},
  'text-align': {left:'text-left',center:'text-center',right:'text-right'},
  'white-space': {nowrap:'whitespace-nowrap','pre-wrap':'whitespace-pre-wrap',normal:'whitespace-normal'},
  'font-weight': {'400':'font-normal','500':'font-medium','600':'font-semibold','700':'font-bold'},
  cursor: {pointer:'cursor-pointer',default:'cursor-default','not-allowed':'cursor-not-allowed'},
  'flex-shrink': {'0':'shrink-0','1':'shrink'},
  overflow: {hidden:'overflow-hidden',auto:'overflow-auto',visible:'overflow-visible'},
  'overflow-x': {auto:'overflow-x-auto',hidden:'overflow-x-hidden'},
  'overflow-y': {auto:'overflow-y-auto',hidden:'overflow-y-hidden'},
  visibility: {hidden:'invisible',visible:'visible'},
  'place-items': {center:'place-items-center'},
  'align-self': {center:'self-center',start:'self-start'},
  'justify-items': {center:'justify-items-center'},
  'box-sizing': {'border-box':'box-border'},
  'text-decoration': {underline:'underline',none:'no-underline','line-through':'line-through'},
  'text-transform': {uppercase:'uppercase'},
  'font-style': {italic:'italic',normal:'not-italic'},
  'list-style': {none:'list-none'},
  'border-collapse': {collapse:'border-collapse'},
  'text-overflow': {ellipsis:'text-ellipsis'},
  'scroll-behavior': {smooth:'scroll-smooth',auto:'scroll-auto'},
  'overscroll-behavior': {contain:'overscroll-contain'},
  isolation: {isolate:'isolate'},
  resize: {vertical:'resize-y',none:'resize-none'},
};
const prefixes = {
  gap:'gap', width:'w',height:'h','min-width':'min-w','max-width':'max-w','min-height':'min-h','max-height':'max-h',
  margin:'m','margin-top':'mt','margin-bottom':'mb','margin-left':'ml','margin-right':'mr',
  padding:'p','padding-top':'pt','padding-bottom':'pb','padding-left':'pl','padding-right':'pr',
  'font-size':'text','line-height':'leading','font-weight':'font','letter-spacing':'tracking',
  'border-radius':'rounded', 'grid-template-columns':'grid-cols','grid-column':'col',
  top:'top',bottom:'bottom',left:'left',right:'right',inset:'inset','z-index':'z',order:'order',
  opacity:'opacity',flex:'flex','flex-basis':'basis',
};
const colors = {'var(--panel)':'panel','var(--text)':'ink','var(--muted)':'muted','var(--border)':'line','var(--subtle)':'subtle','var(--accent)':'accent'};
const encode = v => v.replaceAll('_','\\_').replace(/\s+/g,'_');
function utility(d) {
  if (named[d.prop]?.[d.value]) return named[d.prop][d.value];
  if (d.prop==='color' && colors[d.value]) return `text-${colors[d.value]}`;
  if (d.prop==='background' && colors[d.value]) return `bg-${colors[d.value]}`;
  if (d.prop==='border-color' && colors[d.value]) return `border-${colors[d.value]}`;
  if (prefixes[d.prop]) return `${prefixes[d.prop]}-[${encode(d.value)}]`;
  return `[${d.prop}:${encode(d.value)}]`;
}
let converted = 0, retained = 0;
root.walkDecls(d => {
  // Theme tokens and keyframes are intentionally native CSS, not utilities.
  let keyframe = false;
  for (let p=d.parent;p;p=p.parent) if (p.type==='atrule' && p.name.endsWith('keyframes')) keyframe=true;
  if (d.prop.startsWith('--') || keyframe) {retained++;return;}
  const u=utility(d)+(d.important?'!':'');
  d.replaceWith(postcss.atRule({name:'apply',params:u})); converted++;
});
root.walkAtRules('import',n=>n.remove());
// Keep the original cascade order, including responsive overrides and specificity.
const groups = [[],[],[],[],[]];
let group=0;
for (const n of root.nodes) {
  if (n.type==='comment' && n.text==='Klar learning space: sage, lilac and warm paper.')group=1;
  if (n.type==='comment' && n.text==='Learning centre')group=2;
  if (n.type==='comment' && n.text==='Accessible themed select, including its open list.')group=3;
  if (n.type==='comment' && n.text==='Compact desktop navigation and mobile bottom bar.')group=4;
  groups[group].push(n.clone());
}
fs.mkdirSync('src/styles',{recursive:true});
const files=['foundation','surfaces','learning','select','navigation-achievements'];
function format(node, depth=0) {
  const pad='  '.repeat(depth);
  if(node.type==='comment')return `${pad}/* ${node.text} */\n`;
  if(node.type==='decl')return `${pad}${node.toString().trim()};\n`;
  if(node.type==='atrule'&&!node.nodes)return `${pad}@${node.name} ${node.params};\n`;
  const head=node.type==='rule'?node.selector:`@${node.name} ${node.params}`;
  // One utility statement per declaration preserves shorthand/longhand order.
  return `${pad}${head} {\n${(node.nodes??[]).map(n=>format(n,depth+1)).join('')}${pad}}\n\n`;
}
groups.forEach((nodes,i)=>fs.writeFileSync(`src/styles/${files[i]}.css`, `/* Tailwind component recipes. Keep selector order when editing overrides. */\n@layer components {\n${nodes.map(n=>format(n,1)).join('')}}\n`));
fs.writeFileSync('src/styles.css',`@import "tailwindcss";\n@import "./styles/tokens.css";\n${files.map(f=>`@import "./styles/${f}.css";`).join('\n')}\n\n@custom-variant dark (&:where(.dark, .dark *));\n`);
fs.writeFileSync('src/styles/tokens.css',`/* Semantic colors resolve on .app, so portalled menus inherit the same theme. */\n@theme inline {\n  --color-panel: var(--panel);\n  --color-ink: var(--text);\n  --color-muted: var(--muted);\n  --color-line: var(--border);\n  --color-subtle: var(--subtle);\n  --color-accent: var(--accent);\n  --color-canvas: var(--bg);\n}\n`);
console.log({converted,retained,files});
