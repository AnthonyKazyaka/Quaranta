# App art

`source/*.svg` is the artwork; the PNGs next to this file are what the app uses (`icon.png`, `adaptive-icon.png`
for the Android foreground, `splash-icon.png`, and the web `favicon.png`).

To regenerate a PNG, render its SVG at the size you need (1024 for the icons, 196 for the favicon) with a
transparent background, for example with headless Edge or Chrome:

```bash
msedge --headless=new --default-background-color=00000000 --window-size=1024,1024 --screenshot=icon.png file:///.../icon.html
```

where `icon.html` is a page containing only `<img src="source/icon.svg" width="1024" height="1024">`.
