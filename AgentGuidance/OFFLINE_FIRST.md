# Offline-First & Portability Guidelines

This application is designed for use in **remote environments** (e.g., field operations, radio communication contexts) where Internet access may be intermittent, slow, or non-existent.

## The Prime Directive: Offline Functionality

1.  **Zero External CDNs**
    *   **NEVER** link to scripts, styles, or fonts hosted on CDNs (e.g., Google Fonts, cdnjs, unpkg).
    *   All assets must be served locally from the repository.

2.  **Dependency Management**
    *   **Avoid new dependencies.** The preference is always vanilla JS/CSS/HTML.
    *   If a library is absolutely required, it must be vendored (checked into the repo) or installed via npm and bundled so it works offline.
    *   Current stack: Vanilla JS, WebAssembly (C++), HTML5.

3.  **Browser Compatibility**
    *   Target modern standard browsers but assume no cloud services.
    *   Use Feature Detection for advanced APIs (like WebSerial, WebAudio).

4.  **Performance & Size**
    *   Bandwidth may be limited (radio modems). Keep file sizes small.
    *   Avoid heavy frameworks (React, Angular, Vue) to keep the "edit-refresh" cycle fast and the footprint small.

5.  **PWA & Caching**
    *   Respect the Service Worker (`sw.js`).
    *   Ensure new assets are accounted for in caching strategies if they need to be available offline.

## Testing for Offline Use

*   [ ] disconnect network and reload page. Does it work?
*   [ ] Are all icons and fonts loading from local sources?
*   [ ] Does the app function without a backend server (client-side only mode)?
