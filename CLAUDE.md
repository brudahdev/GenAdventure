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
│   │   ├── src/
│   │   │   ├── worker.ts          # Worker entry: SimService (SimApi) + Comlink bridge to main
│   │   │   ├── core/              # Domain-neutral engine (no game specifics)
│   │   │   │   ├── ec/            # Entity-Component: Entity, Component, ComponentKey, ComponentFactory
│   │   │   │   ├── plan/          # Intent→Command planner: planTypes, Decomposer, CommandSystem, planWalk, ActorPlan
│   │   │   │   ├── action-inference/ # CharacterInferenceAction + InferenceActionManager (Voxta fn-calling)
│   │   │   │   ├── context/       # ContextManager, ContextItem (prompt-context items → Voxta)
│   │   │   │   ├── time/          # Time (30 TPS), Scheduler (persistable min-heap), MinHeap
│   │   │   │   ├── save/          # Saveable / WorldSaveable, RestoreSource, atomicWrite
│   │   │   │   ├── provision/     # SimProvisioner (per-run child container), runContainer token
│   │   │   │   ├── bridge/        # MainSync (the only sim→main push point), REMOTE_MAIN
│   │   │   │   ├── config/        # readJsonConfig, indexById, scenarioConfigPath
│   │   │   │   ├── EventBus.ts    # Typed event bus (ordered listeners)
│   │   │   │   ├── GameSystem.ts  # init()/dispose() lifecycle contract
│   │   │   │   └── NotificationService.ts
│   │   │   └── game/              # Game-specific entities, components, systems
│   │   │       ├── SimWorld.ts    # Run root: ordered systems[], worldSaveables[], persist()
│   │   │       ├── EventSystem.ts # EventBus<GameEvents>; GameEvents.ts is the typed event map
│   │   │       ├── entity/        # CharacterSpawner (blueprints), EntityRegistry, initCharacters
│   │   │       ├── character/     # Per-aspect components: identity, location, locomotion,
│   │   │       │                  #   pose, appearance, clothing, npc, player (each w/ ConfigAdapter)
│   │   │       ├── location/      # Location, SubLocation, LocationManager, LocationContextItem
│   │   │       ├── item/clothing/ # ClothingItem(+State), Outfit/ClothingItem ConfigAdapters
│   │   │       └── plan/          # PlanExecutor, planDefs (intent/command shapes), decomposers/command-systems
│   │   └── test/                  # Vitest; test/system/* boots a real SimWorld from fixtures
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

## Sim Package (`packages/sim`) Architecture

The sim is a self-contained simulation engine that runs in a **worker thread**. It
does not use Electron, `electron-store`, IPC, or the renderer — it talks to the main
process only over a Comlink bridge (`SimApi` / `MainApi`, defined in
`packages/shared/src/simApi.ts`). It has its own DI graph, lifecycle, and save format.

### Run model (one disposable world per run)
- `worker.ts` exposes a `SimService` implementing `SimApi`; `main` is a Comlink proxy
  of `MainApi`. UI actions (`poseUiAction`, `moveUiAction`, …) and Voxta invocations
  (`onInvocation`) land here and delegate to the active `SimWorld`.
- Each `start`/`resume` creates a **child container** (`container.createChildContainer()`),
  runs `SimProvisioner.provision(scope)`, resolves one `SimWorld`, and disposes the
  previous run. Runs are fully isolated. **All sim services are
  `@scoped(Lifecycle.ContainerScoped)`, never `@singleton()`** — a singleton would
  leak across runs.
- Start and resume share one path; the only difference is `RestoreSource` (wraps the
  loaded `SaveDocument`, or `null` for a fresh start). Config always comes from disk.

### Entity-Component layer (`core/ec/`) — not full ECS
- `Entity` = id + ordered component bag. Components are **behavior-rich** (methods,
  state, event subscriptions), unlike data-only ECS components.
- Siblings find each other by typed key: `entity.require(SomeKey)` / `get` / `has`.
  Define a key with `defineKey<T>("dotted.id")`; the id doubles as the save key.
- A component implements the `Component` lifecycle (`init` / `lateInit` / `dispose`)
  and optionally `Saveable` (`save()` → JSON blob). Construct it via a
  `defineFactory(key, (entity, container) => …)` `ComponentFactory`.
- An entity kind is an **ordered `ComponentFactory[]` blueprint** (see
  `CharacterSpawner` PLAYER/NPC blueprints). Order matters — a factory that
  `require()`s a sibling at attach time must come after it.
- **To add an aspect to characters:** write the component + its `ComponentKey` +
  `defineFactory` const (co-located), then append the factory to the blueprint. Touch
  no existing component.
- `EntityRegistry` is the domain-neutral store + query (`with(...keys)`); spawners
  build entities and `register` them.

### System lifecycle
- `SimWorld` keeps an explicit ordered `systems: GameSystem[]`; `init()` runs
  front-to-back once the whole graph is built (so first events reach every
  subscriber), `dispose()` back-to-front. Add a system = one ctor param + one list
  entry.

### Persistence (worker-owned; no `electron-store`)
- Two save surfaces: entity components implementing `Saveable`, and run systems
  implementing `WorldSaveable` (`saveKey` + `save()`, e.g. `time`, `scheduler`).
- Restore is pull-based through the single `RestoreSource` seam
  (`forEntity(id, keyId, default)` / `forWorld(keyId, default)`): components construct
  directly into their final state, the default closure recomputes from config when no
  blob exists. There are **no per-aspect "saved" adapters.**
- `SaveDocument` = `{ version, meta, world, entities[] }`, written atomically
  (`game.json` then `manifest.json`) under `savesLocation/<saveName>/`.

### Intent → Command low level planning layer (`core/plan/`, `game/plan/`; spec: `docs/intent.txt`)
- A plan is **pure data**: `PlanEntry[]` (a mix of `Intent` goals and `Command`
  primitives) + a cursor + each command's `status`. That structure is the plan, the
  expansion frontier, and the save format at once — so the executor is a data cursor,
  never a coroutine.
- Behavior lives in registered systems keyed by `type`: one `Decomposer` per intent
  type, one `CommandSystem` (`validate` pure precondition → `execute`) per command
  type. Register both by adding them to `PlanExecutor`'s constructor lists.
- `advancePlan` walks **lazily at the cursor**: intents decompose just-in-time against
  *current* world state; commands validate then execute; only `completed` advances;
  `running` holds position for time-extended commands (continued by the `Scheduler`).
- Single entry point: `SimWorld.submitIntent(intent)` → `PlanExecutor.submit`. Both UI
  handlers and inference actions funnel through it. Intent/command shapes + factories
  live in `game/plan/planDefs.ts` and per-aspect `behavior/` folders.
- **Reference implementation — AlterClothingState** (`game/character/clothing/behavior/`):
  the canonical worked example of the layer. `AlterClothingStateIntent.ts` (intent shape +
  factory), `AlterClothingStateDecomposer.ts` (emits a `goToCharacter` intent when not
  co-located — which nests further into movement commands — then the alter command,
  guarding on live world state), and `AlterClothingStateCommand.ts` +
  `AlterClothingStateCommandSystem.ts` (the primitive's `validate`/`execute`). Sourced
  from both `worker.ts`'s `clothingStateChangeUiAction` (UI) and `ClothingInferenceAction`
  (Voxta) — mirror it when adding a new intent.

### Inference actions (Voxta function calling) (`core/action-inference/`)
- Subclass `CharacterInferenceAction<S>`: declare an `ArgSchema` once (drives both
  outbound advertisement and typed `handle(args)` decode), implement `computeContent()`
  (all prose recomputed from game state) and `handle()`. Call `refresh()` when state
  changes. `InferenceActionManager` routes invocations and syncs definitions out.

### Time, scheduler, events
- `Time`: 30 TPS interval emitting `time.tick` / `time.second`; game time is saved.
- `Scheduler`: persistable min-heap of events keyed on game time, drained on
  `time.tick`; one handler per event type, **re-registered each run** (data persists,
  behavior rebuilds). This is how time-extended commands continue across ticks/saves.
- `EventSystem extends EventBus<GameEvents>`. Events are a typed map in `GameEvents.ts`;
  listeners have an `order` (lower first).

### Sim → Main bridge (`core/bridge/MainSync.ts`)
- `MainSync` is the **only** place the sim pushes to main: it subscribes to game events
  in `init()` and forwards them over the `REMOTE_MAIN` Comlink proxy. New sim→main
  pushes belong here, not scattered across components.

### Config adapters
- Each config kind has a `XXX_CONFIG_ADAPTER` token + interface + `FileXxxConfigAdapter`
  (reads JSON via `readJsonConfig` + `indexById`), registered as a value in
  `SimProvisioner`. The on-disk `configs/...` layout is the root-doc invariant.

### Testing
- Vitest (`pnpm --filter @gen-adventure/sim test`). System tests in `test/system/`
  boot a real `SimWorld` from fixture configs (`simTestWorld.ts`) and assert on the
  persisted `SaveDocument` and plan execution.
