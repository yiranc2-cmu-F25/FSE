Do / Don’t quick list
Do
Keep only truly public, raw-served assets here.
Use kebab-case, size/variant suffixes, and folders by type.
Version paths for anything that will change.

Don’t
Don’t put code you can import/bundle here (move to src).
Don’t overwrite existing files in place.
Don’t commit >5MB binaries without LFS.

Naming conventions

General

lowercase, kebab-case, ASCII only: my-icon-24.svg, hero-photo-w1280.webp

No spaces, no camelCase, no dots except the extension.

Use semantic folders (icons, logos, photos, illustrations, …).

Images

Icons (SVG preferred)

icon-name-16.svg, icon-name-24.svg (suffix = pixel grid)

Variants: icon-name-filled-24.svg, icon-name-outline-24.svg

Theme: logo-product-dark.svg, logo-product-light.svg

Responsive raster images

Use width suffix: hero-w640.jpg, hero-w1280.jpg, hero-w1920.jpg

Prefer WebP/AVIF for photos; PNG only for transparency/graphics.

Localized images (contain text)

Add locale: banner-w1280-en.png, banner-w1280-zh.png

Fonts

Use WOFF2 only: family-latin-400.woff2, family-latin-700.woff2

Subset names may be added: inter-latin-ext-400.woff2

Media

Video: feature-demo-1080p.mp4 (plus -720p if multiple sizes)

Audio: sound-success.mp3

Lottie: loading-spinner.json

Downloads

Must be versioned in path, not filename reuse:

downloads/v1/whitepaper-2025-09.pdf

Next update → downloads/v2/...

Never overwrite a file in place (public assets are often cached).

Cache & versioning
Files in public/ are not fingerprinted. If you change an existing file,
users may see cached content.
For assets that will change, either:
Put them in src/assets and import (bundler will hash them), or
Version the path (e.g., downloads/v2/..., images/v2/...) and update references.

Size & performance rules
SVG for UI icons; inline them when possible (in code) for theming.
Photos: WebP/AVIF preferred; compress to < 300 KB.
Videos: < 5 MB and short; host elsewhere for larger (>20 MB).
Use Git LFS for any asset > 5 MB (team policy).
Don’t commit raw/source design files (Figma, PSD, AI).

Referencing files

Paths are rooted at /:
<img src="/images/logos/app-logo.svg" alt="App" />

<meta property="og:image" content="/og/og-default.png" />
<link rel="manifest" href="/favicon/site.webmanifest" />
