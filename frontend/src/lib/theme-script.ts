// Before-paint initialization. Keep storage/media rules in sync with ThemeContext.
export const themeInitScript = `(function(){var t='system';try{var s=localStorage.getItem('booksum-theme');if(s==='light'||s==='dark'||s==='system')t=s;}catch(e){}var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';})();`;
