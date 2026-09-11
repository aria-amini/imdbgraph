import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export type Theme = 'light' | 'dark'

const THEME_COOKIE_NAME = 'theme'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function parseTheme(value: unknown): Theme | null {
	return value === 'light' || value === 'dark' ? value : null
}

function readBrowserCookie() {
	return document.cookie
		.split(';')
		.map((entry) => entry.trim())
		.find((entry) => entry.startsWith(`${THEME_COOKIE_NAME}=`))
		?.split('=')[1]
}

/** null means no explicit preference; the browser resolves the OS setting. */
export const getThemePreference = createIsomorphicFn()
	.server(() => parseTheme(getCookie(THEME_COOKIE_NAME)))
	.client(() => parseTheme(readBrowserCookie()))

/** Called by the theme provider; consumers change themes through useTheme. */
export function setThemePreference(theme: Theme): void {
	const root = document.documentElement
	root.classList.remove('light', 'dark')
	root.classList.add(theme)
	root.style.colorScheme = theme
	const secure = location.protocol === 'https:' ? '; Secure' : ''
	document.cookie = `${THEME_COOKIE_NAME}=${theme}; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}${secure}`
}

/** Runs before hydration. The cookie wins; legacy localStorage is migrated
 * only when no preference exists. OS detection never saves an explicit choice. */
export function createThemeBootstrapScript(preference: Theme | null): string {
	return `(function(){
var t=${JSON.stringify(preference)},k=${JSON.stringify(THEME_COOKIE_NAME)};
function valid(v){return v==='light'||v==='dark'}
function cookie(){var entries=document.cookie.split(';');for(var i=0;i<entries.length;i++){var e=entries[i].trim();if(e.indexOf(k+'=')===0)return e.slice(k.length+1)}}
try{
 var c=cookie();if(valid(c))t=c;
 var legacy=localStorage.getItem('theme');
 if(!valid(t)&&valid(legacy)){
  t=legacy;
  document.cookie=k+'='+t+'; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}'+(location.protocol==='https:'?'; Secure':'');
 }
 if(valid(t)&&cookie()===t)localStorage.removeItem('theme');
}catch(e){}
if(!valid(t))t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
var root=document.documentElement;
root.classList.remove('light','dark');root.classList.add(t);root.style.colorScheme=t;
})()`
}
