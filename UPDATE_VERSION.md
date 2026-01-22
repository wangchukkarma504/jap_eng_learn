# Cache Busting Version Update Guide

When you make changes and they're not reflecting in the browser, update the version number in these locations:

## Files to Update:
1. **sw.js** - Line 2: `CACHE_NAME = 'lingobridge-static-v{N}'`
2. **index.html** - Line 2: `<html lang="ja" data-version="{N}">`
3. **index.html** - Line 12: `<link rel="manifest" href="manifest.json?v={N}">`
4. **index.html** - Line 70: `<script type="module" src="index.tsx?v={N}"></script>`
5. **index.html** - Line 75: `navigator.serviceWorker.register('./sw.js?v={N}', ...)`

## Current Version: 4

## Steps to Deploy New Version:
1. Increment version number in all 5 locations above
2. Run `npm run build`
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Or clear browser cache and reload

## Additional Cache Clearing (if needed):
- Open DevTools → Application → Service Workers → Unregister
- Open DevTools → Application → Storage → Clear site data
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
