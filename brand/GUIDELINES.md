# Obsid Brand Guidelines

## Logo

The Obsid logo consists of two mirrored chevrons forming a diamond shape — representing precision, symmetry, and structured data management.

### Variants

| Variant | File | Use case |
|---------|------|----------|
| **Primary** | `*-primary.svg` | Default. Teal (#4d7c6f) on dark surfaces |
| **Light** | `*-light.svg` | Teal icon + dark text (#1a1a1a) on light surfaces |
| **Mono White** | `*-mono-white.svg` | White on overlays, photos, busy backgrounds |
| **Mono Dark** | `*-mono-dark.svg` | Dark (#1a1a1a) for print and documents |

### Logo Types

| Type | File prefix | Description |
|------|-------------|-------------|
| **Icon** (Isotipo) | `icon-*` | Chevron mark only. Use for favicons, avatars, small spaces |
| **Full** | `full-*` | Icon + "OBSID" wordmark side by side |
| **Wordmark** | `wordmark-*` | "OBSID" text only |

## Clear Space

Maintain a minimum clear space around the logo equal to **25% of the icon height** on all sides. No other elements should intrude into this space.

```
    ┌─────────────────────┐
    │     clear space     │
    │   ┌─────────────┐   │
    │   │             │   │
    │   │    < >      │   │
    │   │             │   │
    │   └─────────────┘   │
    │     clear space     │
    └─────────────────────┘
         25% padding
```

## Minimum Size

| Logo type | Minimum width |
|-----------|---------------|
| Icon | 32px |
| Full logo | 120px |
| Wordmark | 80px |

Below these sizes, the logo loses legibility.

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Primary (Teal) | `#4d7c6f` | Logo, accents, interactive elements |
| Surface Dark | `#0a0a0a` | Primary background (dark theme) |
| Surface | `#1a1a1a` | Card/panel backgrounds (dark theme) |
| On Surface | `#e5e5e5` | Primary text (dark theme) |
| White | `#ffffff` | Primary text (light theme) |
| Near Black | `#1a1a1a` | Primary text (light theme) |

## Typography

| Use | Font | Weight |
|-----|------|--------|
| UI text | Outfit | 400–700 |
| Numbers/data | JetBrains Mono | 400–600 |
| Wordmark | Outfit | 600, letter-spacing: 10 |

## Backgrounds

| Background | Recommended variant |
|------------|-------------------|
| Dark surfaces (#0a0a0a, #1a1a1a) | Primary |
| Light surfaces (#f5f5f5, white) | Light |
| Photos or busy imagery | Mono White |
| Print / documents | Mono Dark |

## Don'ts

- Do not stretch, skew, or rotate the logo
- Do not change the logo colors outside the defined variants
- Do not add effects (shadows, gradients, outlines, glow)
- Do not place the primary variant on light backgrounds
- Do not place the logo on busy backgrounds without using the mono variant
- Do not rearrange the icon and wordmark in the full logo
- Do not use the logo smaller than the minimum sizes above

## File Structure

```
brand/
  master/          # Source files
    logo-icon.svg
    logo-full.svg
    logo-wordmark.svg
  variants/        # Color variants (use these)
    icon-primary.svg
    icon-light.svg
    icon-mono-white.svg
    icon-mono-dark.svg
    full-primary.svg
    full-light.svg
    full-mono-white.svg
    full-mono-dark.svg
    wordmark-primary.svg
    wordmark-light.svg
    wordmark-mono-white.svg
    wordmark-mono-dark.svg
  export/          # Raster exports
    favicon.ico
    icon-32.png
    icon-64.png
    icon-128.png
    icon-256.png
    icon-512.png
    og-image.png
  preview.html     # Visual preview of all variants
  GUIDELINES.md    # This file
```
