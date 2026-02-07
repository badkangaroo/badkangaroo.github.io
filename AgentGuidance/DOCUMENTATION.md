# Documentation Maintenance Guide

Documentation is critical for this project, especially given its potential use in offline/remote scenarios where online help is unavailable.

## Documentation Strategy

1.  **Maintain Existing Docs**
    *   Before creating a new file, check `Docs/` and the root `README.md`.
    *   Update existing documents to reflect code changes immediately.
    *   Avoid stale documentation; if code changes, docs must change in the same commit/step.

2.  **Minimal Resource Overhead**
    *   Do not add large images, videos, or PDFs unless critical.
    *   Use standard Markdown.
    *   Text-based diagrams (Mermaid or ASCII) are preferred over binary images for version control and size efficiency.

3.  **Local Availability**
    *   All documentation must be readable directly from the file system.
    *   Do not rely on external links for core functionality explanations. Assume the user has **NO INTERNET ACCESS**.

## Structure

*   **/Docs**: Detailed technical documentation, architecture, and APIs.
*   **README.md**: High-level overview, quick start, and project status.
*   **Code Comments**: Use JSDoc/Doxygen styles for function-level documentation to generate help if needed, but keep comments relevant and fresh.

## Checklist

*   [ ] Did I update `README.md` if the build/run process changed?
*   [ ] Did I update API docs in `Docs/` if public interfaces changed?
*   [ ] Is the documentation readable as raw text/markdown?
