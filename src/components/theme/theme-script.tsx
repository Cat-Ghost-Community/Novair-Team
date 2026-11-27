// Runs synchronously before paint. First visit is always light, regardless of OS preference.
export function ThemeScript() {
  const script = `(function(){var t='light';try{if(localStorage.getItem('novair-theme')==='dark')t='dark'}catch(e){}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
