# Hero Slideshow Feature Design
**Date:** 2026-04-04  
**Updated:** 2026-04-05 (working solution finalized)  
**Component:** `src/components/Hero.astro`  
**Status:** Implemented and tested

## Overview

Enhance the Hero component to support both single images (existing behavior) and image arrays (new slideshow mode). When multiple images are provided, they display as an autoplay slideshow with smooth cross-fade transitions and randomized order. The implementation uses two stacked `<img>` elements that swap visibility, eliminating white flash issues and ensuring smooth 0.9s dissolve transitions.

## Requirements

### Props

The component accepts a polymorphic `imgSrc` prop:
- **Single image (string):** `imgSrc="/assets/img/hero.jpg"` — renders as before, no changes
- **Multiple images (array):** `imgSrc={["/img1.jpg", "/img2.jpg", "/img3.jpg"]}` — enters slideshow mode
- **imgAlt (string):** Single alt text for all images in slideshow (reuse existing prop)
- Other existing props (`className`, `id`, etc.) unchanged

### Behavior: Slideshow Mode

When `imgSrc` is an array:

1. **Randomization:** Shuffle all images on page load (after `load` event) for fresh random order on each reload
2. **Initial Display:** Show first image (from original order) immediately, optimized and visible
3. **Image Optimization:** Apply responsive image optimization (srcset, sizes) to ALL images via existing `imageUtils` at build time
4. **Autoplay:** Rotate through images automatically
   - Duration per slide: **5 seconds** (configurable constant)
   - Fade transition: **0.9 seconds** (smooth cross-fade, no white flash)
   - Loop continuously back to first image
5. **Progressive Loading:**
   - After page `load` event fires, shuffle image order for randomization
   - Pre-load next image into hidden element before fade starts
   - Two elements in DOM at all times: one visible, one hidden
   - No images added/removed from DOM; only src/srcset updated
6. **Cross-Fade Method:**
   - Two stacked `<img>` elements at identical size/position
   - Visible element fades out while hidden element fades in simultaneously
   - Element roles swap after fade; hidden becomes visible
   - Avoids white background flash by ensuring next image is loaded before visibility change
7. **No Manual Controls:** Autoplay only, no pause/hover/keyboard controls

### Single Image Mode (Unchanged)

When `imgSrc` is a string, component behaves exactly as it does today:
- Responsive image optimization via `imageUtils`
- No slideshow logic
- No background scripts or timers

## Technical Design

### Component Structure

```
Hero.astro
├── Frontmatter (top)
│   ├── Constants: SLIDE_DURATION, FADE_DURATION
│   ├── Props interface
│   ├── Image optimization (imageUtils for all images)
│   └── Pass all image metadata to client
├── HTML markup
│   ├── Image container with data attributes
│   ├── Two stacked <img> elements (for cross-fade)
│   └── Overlay div (for rolling-up animation)
└── Styles
    └── Fade transition (opacity + CSS transition for both images)
└── Client script (IIFE)
    ├── Shuffle all images on page load
    ├── Update first image if changed by shuffle
    └── Cross-fade loop: visible ↔ hidden elements
```

### Constants

```javascript
const SLIDE_DURATION = 5000; // milliseconds per slide (5 seconds)
const FADE_DURATION = 0.9;   // seconds for CSS transition
```

### HTML Structure

Two `<img>` elements stacked absolutely:
- `#hero-image` (visible by default, opacity: 1)
- `#hero-image-next` (hidden by default, opacity: 0)

Both inherit positioning and sizing from shared `.hero__img img` CSS rules with responsive breakpoints.

### Cross-Fade Mechanism

Instead of updating src/opacity on the same element (which causes flashing), use two elements:
1. **Visible element** displays current image at opacity 1
2. **Hidden element** pre-loads next image at opacity 0
3. **Fade transition:** visible → 0, hidden → 1 (simultaneous)
4. **After fade:** swap element roles, hidden becomes visible, repeat

This ensures the next image is always fully loaded before it becomes visible.

### Data Flow

1. **Build time (Astro):**
   - Receive `imgSrc` prop (string or array)
   - Optimize ALL images with `imageUtils` (not just first)
   - Pass all images and metadata to client as JSON

2. **Initial page load:**
   - First image renders immediately
   - GSAP overlay animation rolls up white overlay (existing behavior)
   - No slideshow activity yet

3. **After page load event:**
   - Shuffle all images (including first) for fresh randomization
   - If first image changed due to shuffle, update it immediately
   - Pre-load next image into hidden element
   - Start 5-second rotation timer
   - On each timer tick:
     - Pre-load future image into hidden element
     - Cross-fade: visible → hidden (opacity transitions)
     - Swap element roles
     - Repeat

## Edge Cases & Assumptions

- **Single image in array:** Treated as slideshow mode (works fine, just doesn't rotate; unnecessary but safe)
- **Empty array:** Not handled (assume never passed; component validates)
- **Randomization:** All images (including first) are shuffled fresh on each page load
- **Image load timing:** Next image is pre-loaded into hidden element before fade starts, guaranteeing smooth transitions
- **Browser without JS:** Falls back to showing first image (no rotation, no visible issues)

## Testing Considerations

- **Single image mode:** renders as before, no regression, no slideshow logic runs
- **Array with 2+ images:** rotates correctly, smooth cross-fade without white flash
- **Randomization:** different starting image on each page reload (Ctrl+Shift+R too)
- **Image optimization:** all images have srcset/sizes attributes from build time
- **Page load performance:** first image loads immediately, subsequent images pre-loaded during rotation
- **Responsive images:** images maintain correct size across viewport breakpoints during fade
- **Cross-fade smoothness:** no flickering, no white background flash, no stutter during transitions
- **Element tracking:** verify `#hero-image` and `#hero-image-next` swap roles correctly

## Future Enhancements (Out of Scope)

- Dot indicators for manual navigation
- Pause on hover
- Keyboard controls (arrow keys)
- Customizable slide duration per image
- Preload all images upfront (if performance testing shows it's acceptable)

## Files to Modify

- `src/components/Hero.astro` — main implementation
- `src/styles/app.css` — fade transition rule (minimal)
