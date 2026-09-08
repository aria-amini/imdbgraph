// Runs before paint: reads the stored choice, else follows the OS setting.
// Keeping the site's original dark default for "no preference" systems.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':!window.matchMedia('(prefers-color-scheme: light)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`
