// Execute through the authorized Chrome tool with the local official axe engine installed.
// This is an alternative inspection source, not an execution of the retained Playwright transport.
export async function inspectContentPage() {
  await document.fonts.ready;
  if (!window.axe) throw Error('Official axe is required.');
  const initial = document.documentElement.style.fontSize;
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await settle();
  const noOverflow = document.documentElement.scrollWidth <= innerWidth;
  document.documentElement.style.fontSize = '200%'; await settle();
  const text200NoOverflow = document.documentElement.scrollWidth <= innerWidth;
  document.documentElement.style.fontSize = initial; await settle();
  const result = await window.axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
  const value={path:location.pathname,width:innerWidth,theme:document.documentElement.dataset.theme,rtl:document.documentElement.dir,noOverflow,text200NoOverflow,axeViolations:result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))};
  if(!noOverflow||!text200NoOverflow||value.rtl!=='rtl'||value.axeViolations.length)throw Error(JSON.stringify(value));
  return value;
}
