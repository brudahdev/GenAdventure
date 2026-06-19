## Project Overview

**GenAdventure** is an evolution of classic text adventure games, enhanced with generative AI capabilities. The game features:
- AI-driven character dialogue and actions via Voxta
- Voice generation and speech recognition
- Game world simulation loop running in a worker thread
- Type-safe actor-model message bus between main process and sim worker
- Cross-platform desktop app (Windows/Mac)


## Architecture
Loose OOP DDD with tsyringe dependency injection. Sim package uses Entity component scripting, but not full ECS

- **Prefer objects (classes) over functions and closures.** Services are `@singleton()` classes resolved via constructor injection or `container.resolve()`.
- **Organize by feature** under `main/domain/` (character, chat, save, scenario, sim). External integrations live under `main/integration/`.
- **IPC handlers are the application layer** — they bridge renderer IPC calls to domain services. Each feature has its own handler class.
- **Model mapping is only required at external integration boundaries** (Voxta DTOs → domain models in `shared`). Communication between ui/main/sim uses shared types directly — no mapping needed.
- **DI bootstrap:** `reflect-metadata` is imported at the top of `main/index.ts`; all handler singletons are resolved in `IpcRegister.ts`.
- Re-use UI components where possible.
- Keep single responsibility — avoid cluttering `main/index.ts`.

## Implementation Invariants
Cross-cutting rules that must hold across changes:

- **Persistence is main-process and sim only.** electron-store + `fs` live in main; the renderer never imports `fs` or touches the filesystem. All config storage and Voxta access is exposed through the preload `contextBridge` IPC. The actual game state is saved by the worker process
- **electron-store is pinned to v8 (CommonJS).** Do not bump to v9+ while the main bundle is CommonJS (`tsconfig.node.json` `module: CommonJS` + `externalizeDepsPlugin`); v9+ is ESM-only and breaks the build.
- **Preload API and `renderer/src/env.d.ts` are one contract** — change them together.
- **IPC channel naming:** `domain:action` (e.g. `sim:get-value`, `voxta-config:set`, `save-data:read`). IPC handlers are per-feature `@singleton()` classes under `main/domain/*/` and `main/integration/*/`. All handlers are resolved at startup in `IpcRegister.ts` — no business logic in handlers, they delegate to domain services.
- **All on-disk app data lives under `userData/save_data/`.** `main/integration/voxta/config/saveDataStore.ts` reads/writes paths relative to that root and rejects path traversal. App config files go under `configs/`. Layout: `configs/appearance.json`, `configs/outfit.json`, `configs/clothing.json`, `configs/characters/<characterId>.json`, `configs/scenarios/<scenarioId>/<roleOrder>.json` (`roleOrder` = the role's index in the Voxta scenario `roles` array).
- **Voxta DTO → domain mapping is mandatory.** Raw Voxta REST/SignalR response shapes are typed as DTOs private to `main/integration/voxta/` (`voxtaDtos.ts`, `voxtaSignalDtos.ts`) and converted by dedicated mappers (`voxtaMappers.ts`, `voxtaSignalMappers.ts`) into domain models in `packages/shared` (`shared/src/voxta.ts`). `VoxtaClient` fetches **and maps**, returning domain models only. UI components consume domain models exclusively; **Voxta DTOs never reach the renderer**.
- **Routing:** Solid Router; each config page is its own route (`/config/<name>`, with params for nested ones). The Scenario Config page receives its domain scenario via router `state`, falling back to refetch-by-id on a cold load (reload).
- **Reusable UI building blocks** (`renderer/src/components/`): prefer `JsonEditorPage` for any simple JSON config (just pass `title` + save_data `path`). Shared primitives: `FixedTopBar`, `FixedBottomBar`, `CollapsibleSection`, `SearchBar`, `ConfigButton`.
- **Styling:** no inline styles; reuse classes/variables from `renderer/src/styles/{theme,components}.css`. Default style: Dark grey, divs on top lighter. white text.



## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22+, Electron 30+ |
| **Language** | TypeScript |
| **Monorepo** | pnpm workspaces |
| **Build** | electron-vite + Vite |
| **Packaging** | electron-builder |
| **UI Framework** | SolidJS |
| **DI** | tsyringe + reflect-metadata |
| **Message Bus** | ActorBridge (custom typed actor model) |

## Project Structure

```
GenAdventure/
├── packages/
│   ├── shared/                    # Shared types and utilities
│   │   └── src/
│   │       ├── ActorBridge.ts     # Generic message bus class
│   │       ├── messages.ts        # MainToSim / SimToMain type maps
│   │       └── index.ts
│   │
│   ├── sim/                       # Simulation engine (runs in worker thread)
│   │   └── src/
│   │       └── worker.ts          # Worker entry point
│   │
│   └── app/                       # Electron application
│       ├── src/
│       │   ├── main/
│       │   │   ├── index.ts           # Bootstrap: reflect-metadata, DI, Electron lifecycle
│       │   │   ├── IpcRegister.ts     # Resolves all IPC handler singletons
│       │   │   ├── domain/
│       │   │   │   ├── character/     # CharacterService, CharacterIpcHandlers
│       │   │   │   ├── chat/          # ChatService
│       │   │   │   ├── save/          # SaveDataService, SaveDataIpcHandlers
│       │   │   │   ├── scenario/      # ScenarioService, ScenarioIpcHandlers
│       │   │   │   └── sim/           # SimManager
│       │   │   └── integration/
│       │   │       └── voxta/
│       │   │           ├── config/    # voxtaConfig, saveDataStore, VoxtaConfigIpcHandler
│       │   │           ├── voxtaClient.ts
│       │   │           ├── voxtaSignal.ts
│       │   │           ├── voxtaDtos.ts / voxtaSignalDtos.ts
│       │   │           └── voxtaMappers.ts / voxtaSignalMappers.ts
│       │   ├── preload/index.ts   # Context bridge, exposes electronAPI
│       │   └── renderer/
│       │       ├── index.html
│       │       └── src/
│       │           ├── main.tsx   # SolidJS entry
│       │           ├── App.tsx    # Root UI component
│       │           └── env.d.ts   # Window types
│       ├── electron-vite.config.ts
│       ├── electron-builder.yml
│       ├── tsconfig.*.json
│       └── package.json
│
├── tsconfig.base.json             # Shared TS config
├── pnpm-workspace.yaml
├── package.json
└── .gitignore
```

## Key Concepts



### Development

```bash
# Install dependencies (monorepo root)
pnpm install

# Start dev server with hot reload
pnpm dev

# Build for production
pnpm build

# Package for distribution (creates .exe on Windows, .dmg on Mac)
pnpm package
```

### Workspace-specific

```bash
# Build only the @gen-adventure/app package
pnpm --filter @gen-adventure/app build

# Install in just the sim package
pnpm --filter @gen-adventure/sim install
```
