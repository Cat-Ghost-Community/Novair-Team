// Run through the authorized Chrome tool after installing the local official axe source.
// This browser function is an inspection primitive, not a claimed Playwright launcher.
export async function inspectSupportPage() {
  await document.fonts.ready;
  if (!window.axe) throw new Error('Install the local official axe engine first.');
  const before = document.documentElement.style.fontSize;
  const noOverflow = document.documentElement.scrollWidth <= innerWidth;
  document.documentElement.style.fontSize = '200%';
  const text200NoOverflow = document.documentElement.scrollWidth <= innerWidth;
  document.documentElement.style.fontSize = before;
  const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
  if (result.violations.length || !noOverflow || !text200NoOverflow || document.documentElement.dir !== 'rtl') {
    throw new Error(JSON.stringify({ noOverflow, text200NoOverflow, violations: result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) }));
  }
  return { path: location.pathname, width: innerWidth, theme: document.documentElement.dataset.theme, rtl: 'rtl', noOverflow, text200NoOverflow, axeViolations: 0 };
}
