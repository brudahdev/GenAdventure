# GenAdventure

**GenAdventure** is an AI-driven evolution of the classic text adventure. With LLM diologue and stable diffusion graphics.
 You play a
character inside a simulated scene, alongside AI-driven NPC's. World state is fed as context to the LLM at a per character level and is reactive to state changes induced by action inference. A Visiblity ruleset builds stable diffusion prompts wich are used as avatar images.
Most content is delcarivly defined and stored in JSON config files. A UI is provided to edit and validate these configurations.


TextGen/TTS/STT provided by
[Voxta](https://voxta.ai/).

---




## Simulation Domain

A quick tour of the things you'll interact with as a player.

<details>
<summary>Characters</summary>
There's **you** (the player) and the **AI characters** (NPCs). An AI character only
joins the active scene — appearing as an avatar and taking part in the conversation —
while they're **in the same place as you**. Walk away and they drop out of the scene;
come back and they rejoin.
</details>

<details>
<summary>Locations</summary>
The world is a set of **rooms** (Locations). Each room has a few **spots** within it
(sub-locations — e.g. the middle of the bedroom, or the bed), and rooms are joined to
each other by **doorways** (links). Moving between spots in the same room is instant;
moving to another room walks you through the doorway. **Where you are sets the
background** you see.
</details>
<details>
<summary>Poses</summary>
Every character is in a **pose** — standing, sitting, lying down, and so on. Which poses
are available depends on **where they're standing**: a bed lets someone lie down, a
chair lets them sit. A character's pose shows up in their avatar image and can hide
parts of them from view.
</details>
<details>
<summary>Clothing & appearance</summary>
Characters wear **layered outfits** — a coat over a shirt, and so on — and each garment
can be in different **states** (on, off, unzipped, pulled down…). This is where the
simulation shines: **dressing, undressing, and posing actually change what's visible.**
Open a coat and the shirt underneath shows; take the shirt off and the skin it was
covering is revealed. When something becomes newly visible or newly hidden, **the AI
characters present in the room notice it**, and the generated image updates to match.
</details>
<details>
<summary>Acting on the world</summary>
You act through the game's UI (move, change a pose, change someone's clothing). The AI
characters act by **choosing** to do those same things. Both paths run through the same
"**intent → plan → do it**" pipeline, so actions behave consistently — for example,
"undress that character" will first walk over to them, then do it.
</details>

---

## Content Authoring

<details>

Scenarios are **data-driven**: the world above is assembled from JSON config files
under the app's `configs/` directory. If you want to build your own scenario, these are
the pieces you'll work with:

- **Scenario & locations** — `configs/scenarios/<scenarioId>/…` defines the room graph:
  **locations**, the **sub-locations** (spots) inside each, the **links** (doorways)
  between rooms, and, per sub-location, which **poses** are allowed there and how each
  looks.
- **Characters** — `configs/characters/<characterId>.json` holds a character's identity
  (pronouns, body configuration, and which **appearance entries** make them up).
- **Appearance** — `configs/appearance.json` defines **appearance entries** (race, sex,
  hair, body parts…) and an **appearance-class hierarchy**. Classes nest (e.g. a chest
  class containing finer parts), so covering a parent covers everything beneath it. This
  is what clothing and poses hide and reveal.
- **Clothing & outfits** — `configs/clothing.json` defines garments: their **slot**
  (which layer they occupy), their **states**, which **appearance classes each state
  covers**, and how a garment **occludes the items layered beneath it**.
  `configs/outfit.json` groups garments into outfits and defines the slot hierarchy that
  determines layering.

The covering system ties these together: a garment's state and a character's pose both
feed one "what's visible right now" model, which drives both the AI's text context and
the generated images. For the full mechanics, see
[`CLAUDE.md`](CLAUDE.md) and the simulation source under
[`packages/sim/`](packages/sim/).
</details>

---

## Planned Features
<details>

- **Items** — Declartivly defined, with affordances on actions, contribute to context, and included in avatar generation.
- **Weather Time of Day, and Heat** - To enrich context and background image generation.
- **Background AI** — Traditional, non-generative AI layer. NPCs will be active when not being controlled by LLM. Possibly GOAP based.
  * Personality
  * Emotion
  * Needs
  * Schedules
- **Authored diologue** - Both scripted and rule based. Either litterally or presented to be interpreted by LLM.
- **Emotion Modeling** - Will guide LLM diologue and enrich Avatar generation.
- **Relationships/Memory/hysterisis** — A lightweight version of Comme il Faut. Relationships will provide addtional context to the llm. Actions can change relationships, and past events can prompt LLM on what to discuss.
- **Configuration loading and export** — To eaisly share scenairos.

</details>

---

## Architecture at a glance

GenAdventure is an **Electron** desktop app (a Node main process plus a **SolidJS**
renderer) paired with a **simulation engine that runs in a worker thread**. The two
talk over a typed [Comlink](https://github.com/GoogleChromeLabs/comlink) bridge, and
**Voxta** provides the AI dialogue, voices, and speech recognition. The simulation owns
all game state and persistence; the app handles the UI, Voxta integration, and image
generation.

For internals — the entity-component model, the intent→command planner, persistence,
and the sim↔main bridge — see the **Sim Package Architecture** section of
[`CLAUDE.md`](CLAUDE.md).

---

## Running it

### Tech stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22+, Electron 30+ |
| **Language** | TypeScript |
| **Monorepo** | pnpm workspaces |
| **Build** | electron-vite + Vite |
| **Packaging** | electron-builder |
| **UI Framework** | SolidJS |
| **DI** | tsyringe + reflect-metadata |
| **Message Bus** | Comlink (typed actor-model bridge) |

### Prerequisites
- **Node.js 22+**
- **pnpm** (the repo is a pnpm workspace)

### Commands

```bash
# Install dependencies (run at the monorepo root)
pnpm install

# Start the dev build with hot reload
pnpm dev

# Build for production
pnpm build

# Package a distributable (.exe on Windows, .dmg on Mac)
pnpm package
```

Workspace-specific:

```bash
# Build only the Electron app package
pnpm --filter @gen-adventure/app build

# Run the simulation engine's tests
pnpm --filter @gen-adventure/sim test
```

For contributor-facing architecture, conventions, and invariants, see
[`CLAUDE.md`](CLAUDE.md).
