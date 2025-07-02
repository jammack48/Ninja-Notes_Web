# Claude Project Context – Ninja Notes

_This file provides project context and instructions for AI assistants (like Claude) and human contributors._

## Overview
Ninja Notes is a cross-platform task management and note-taking application built with React (TypeScript) and Supabase. The project is split into two frontends:

1. **ninja-notes-mobile**  
   - A mobile-first app built with React + Capacitor.
   - Allows users to create and manage tasks.
   - Supports voice-to-text input for task creation.
   - Handles native notifications.
   - Includes secure access via PIN.
   - Optimized for on-the-go use.

2. **ninja-notes-web**  
   - A web-based companion app with a cork board interface.
   - Displays reminders and tasks from Supabase as sticky notes on a draggable cork board layout.
   - Meant for desktop users who want a bird's-eye visual dashboard of their tasks.
   - Future features may include drag-to-prioritize, filters by category, and color-coded stickies.

Both apps share the same Supabase backend, which handles authentication, task storage, and voice data (if used).

## Key Technologies
- **Frontend:** React + TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Functions, Storage)
- **Mobile:** Capacitor (Android + iOS support)
- **Drag & Drop UI:** Planned for `react-grid-layout` or `react-draggable` in the web app
- **Voice Input:** Using either Capacitor plugins or Supabase functions to process input

## Goals
- Provide a fast, secure, voice-friendly note-taking experience on mobile.
- Offer a cork board-style overview of all tasks for desktop users.
- Keep the codebase clean, maintainable, and scalable.
- Share as much logic (e.g., task handling, API calls) as possible between platforms.

## UI/UX Notes
- Web version should feel playful and visual, like a real cork board with post-it notes.
- Mobile version should be lightweight, fast, and intuitive for quick task capture.
- Both should use consistent styling where applicable, but tailor interactions to each platform.

## Future Ideas
- Allow push-to-web from mobile (e.g., "Remind me to invoice Nigel" adds a sticky note to the cork board).
- Categorize tasks by color, urgency, or tags.
- Enable real-time collaboration (team cork boards).
- Add browser notifications to the web app.

## Claude Instructions
When editing or expanding this project:
- Use TypeScript.
- Follow existing folder structures.
- Keep components modular.
- Prefer named exports and reusable hooks.
- Don't include mobile-specific logic in the web project unless explicitly asked.
- Use Tailwind (or styled-components) for styling where applicable. 