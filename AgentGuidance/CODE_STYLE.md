# Agent Code Style & Contribution Guide

This project prioritizes **minimal, succinct, and focused** changes to maintain stability and portability for radio-based/offline environments.

## Core Principles

1.  **Minimal Changes**
    *   Touch only the lines necessary to implement the feature or fix the bug.
    *   Avoid refactoring unrelated code "while you are there."
    *   Preserve existing whitespace and formatting styles to minimize diff noise.

2.  **Succinctness**
    *   Write code that is easy to read and direct.
    *   Avoid over-abstraction or complex design patterns unless absolutely necessary for the problem at hand.
    *   Prefer simple functions over complex class hierarchies.

3.  **Focused Context**
    *   When implementing a feature, limit your scope to that specific feature.
    *   If you find a separate issue, note it or create a new task, but do not fix it in the current change unless it is a blocker.

4.  **No Unnecessary Dependencies**
    *   Do not add npm packages or external libraries without explicit permission.
    *   Standard Web APIs are preferred over utility libraries (e.g., use `fetch` instead of `axios` or `jquery`).

## Review Checklist for Agents

*   [ ] Does this change modify *only* what is requested?
*   [ ] Are there any added dependencies? (Should be None)
*   [ ] Is the code readable without extensive comments?
*   [ ] Have existing patterns been followed?
