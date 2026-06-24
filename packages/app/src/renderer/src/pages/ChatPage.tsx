import { createSignal, For, Show, onCleanup, onMount, createEffect } from 'solid-js'
import microphoneSvg from '../assets/icons/microphone.svg?raw'
import type { JSX } from 'solid-js'
import { useNavigate, useLocation } from '@solidjs/router'
import type {
  VoxtaScenarioSummary,
  ClothingStateChangeOptionsSummary,
  NearbyLocationSummary,
  TouchOptions
} from '@gen-adventure/shared'
import { PLAYER_CHARACTER_ID, BACKGROUND_TRANSITION_FADE_MS } from '@gen-adventure/shared'
import ContextMenu from '../components/ContextMenu'
import type { ContextMenuItem } from '../components/ContextMenu'
import ChatInputBox from '../components/ChatInputBox'
import AudioController from '../components/AudioController'
import CharReveal, { CHAR_FADE_MS } from '../components/CharReveal'
import ImageConfigForm from '../components/ImageConfigForm'
import ChatAvatar, {
  AVATAR_FADE_MS,
  AVATAR_RELAYOUT_MS,
  AVATAR_RELAYOUT_EASING,
  AVATAR_SPEAKING_SIZE_PERCENT
} from '../components/ChatAvatar'
import GameClock from '../components/GameClock'
import SaveSlotModal from '../components/SaveSlotModal'
import ConfirmModal from '../components/ConfirmModal'
import {
  micMuted,
  setMicMuted,
  speakerMuted,
  setSpeakerMuted,
  recordingStatus,
  playbackStatus
} from '../stores/audio-store'
import { messages, upsertFinalText, reset } from '../stores/chat-store'
import type { DisplayMessage } from '../stores/chat-store'
import {
  avatars,
  setAvatar,
  markAvatarExiting,
  spliceAvatar,
  clearAvatars,
  backgroundImage,
  setBackgroundImage
} from '../stores/image-store'
import { sceneFading, setSceneFading, setSceneBlack } from '../stores/transition-store'

/** What to render for a message: a static `revealed` prefix plus the currently
 *  voicing `playing` chunk (revealed character-by-character over `duration`).
 *  Null hides the bubble entirely. */
interface MessageView {
  revealed: string
  playing: string
  duration: number
  interrupted?: boolean
}

/**
 * Resolve what (if anything) a message should show right now. Returns null to
 * hide the bubble entirely — a character reply stays hidden until it starts
 * voicing (its first chunk) or settles, so the authoritative full text is never
 * shown out of sync with the karaoke (no full-text flash, no restart). Every
 * reply ends with a reply-end signal, so an un-voiced bubble always settles —
 * no-audio/silence replies settle as soon as that signal arrives.
 */
function viewOf(m: DisplayMessage): MessageView | null {
  if (m.role === 'user') return { revealed: m.finalText ?? '', playing: '', duration: 0 }
  if (m.interrupted) return { revealed: m.revealed, playing: '', duration: 0, interrupted: true }
  if (m.playing != null) return { revealed: m.revealed, playing: m.playing, duration: m.playingDuration }
  if (m.settled) return { revealed: m.finalText ?? m.revealed, playing: '', duration: 0 }
  if (m.revealed !== '') return { revealed: m.revealed, playing: '', duration: 0 } // between its own chunks
  return null // nothing voiced yet — hide until it starts voicing or settles
}


/** Build the clothing-item → state cascade for a character's options. Each leaf
 *  state, when clicked, requests the change over IPC. */
function buildClothingItemsMenu(
  characterId: string,
  options: ClothingStateChangeOptionsSummary[]
): ContextMenuItem[] {
  return options.map((opt) => ({
    label: opt.clothingItemId,
    children: opt.stateIds.map((stateId) => ({
      label: stateId,
      onSelect: () =>
        void window.electronAPI.clothing.changeState(characterId, opt.clothingItemId, stateId)
    }))
  }))
}

/** Build the move-destination list for a character. Sub-locations of the current
 *  location render normally; the wider (non-sub) locations render red. Each leaf,
 *  when clicked, requests the move over IPC. */
function buildLocationMenu(
  characterId: string,
  summary: NearbyLocationSummary
): ContextMenuItem[] {
  const subItems: ContextMenuItem[] = summary.subLocations.map((loc) => ({
    label: loc.id,
    onSelect: () => void window.electronAPI.location.move(characterId, loc.id)
  }))
  const locationItems: ContextMenuItem[] = summary.locations.map((loc) => ({
    label: loc.id,
    danger: true,
    onSelect: () => void window.electronAPI.location.move(characterId, loc.id)
  }))
  return [...subItems, ...locationItems]
}

/** Build the available-poses list for a character. Each leaf, when clicked,
 *  requests the pose change over IPC. */
function buildPoseMenu(characterId: string, poses: string[]): ContextMenuItem[] {
  return poses.map((poseId) => ({
    label: poseId,
    onSelect: () => void window.electronAPI.pose.set(characterId, poseId)
  }))
}

/** Build the touch cascade for a character: Target Part → With → Action. The
 *  leaf (verb), when clicked, requests the touch interaction over IPC with all
 *  three ids. Returns the target-level items. */
function buildTouchMenu(characterId: string, options: TouchOptions): ContextMenuItem[] {
  return options.targets.map((target) => ({
    label: target.id,
    childLabel: 'With',
    children: target.with.map((w) => ({
      label: w.id,
      childLabel: 'Action',
      children: w.verb.map((v) => ({
        label: v.id,
        onSelect: () =>
          void window.electronAPI.touch.action(characterId, target.id, w.id, v.id)
      }))
    }))
  }))
}

/** Build the list of touch interactions currently active on a character. Selecting
 *  one requests stopping it over IPC. */
function buildStopTouchMenu(characterId: string, interactionIds: string[]): ContextMenuItem[] {
  return interactionIds.map((id) => ({
    label: id,
    onSelect: () => void window.electronAPI.touch.stop(characterId, id)
  }))
}

/**
 * The live chat screen. Subscribes to assembled messages from Voxta (character
 * replies and recognized-speech user turns) via ChatService over IPC, stacks them
 * oldest-on-top above a fixed input box, and hosts the (invisible) AudioController
 * that plays streamed TTS and streams the mic. Typed messages are echoed
 * optimistically (Voxta doesn't echo typed text back). The red quit button tears
 * down the sim + chat and returns to the previous page (ScenarioConfigPage).
 */
export default function ChatPage(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation<{ scenario?: VoxtaScenarioSummary }>()
  const scenarioId = (): string | undefined => location.state?.scenario?.id
  let typedSeq = 0
  const [headerOpen, setHeaderOpen] = createSignal(false)
  const [showImagePanel, setShowImagePanel] = createSignal(false)
  const [showSaveModal, setShowSaveModal] = createSignal(false)
  const [showQuitConfirm, setShowQuitConfirm] = createSignal(false)
  const [partialText, setPartialText] = createSignal('')
  // Scrollable message column + the avatars row (whose dynamic height pins the
  // column's bottom edge); both refs are wired to their divs below.
  let messagesEl!: HTMLDivElement
  let avatarsRowEl!: HTMLDivElement
  let chatPageEl!: HTMLDivElement
  const [menu, setMenu] = createSignal<{
    x: number
    y: number
    items: ContextMenuItem[]
    openUp: boolean
    submenuSide: 'left' | 'right'
    label?: string
  } | null>(null)

  createEffect(() => {
    if (!headerOpen()) setShowImagePanel(false)
  })

  // Auto-scroll the message column to the newest message. Touch each message's
  // reactive fields so the effect re-runs as text streams in / settles; defer the
  // scroll a microtask so the DOM has grown before we measure scrollHeight.
  createEffect(() => {
    messages.map((m) => [m.revealed, m.playing, m.finalText, m.settled])
    queueMicrotask(() => {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' })
    })
  })

  // NPC avatar right-click: action menu at the cursor, cascading down/right.
  const openAvatarMenu = async (characterId: string, x: number, y: number): Promise<void> => {
    const [options, locations, poses, touch, activeTouches] = await Promise.all([
      window.electronAPI.clothing.getOptions(characterId),
      window.electronAPI.location.getOptions(characterId),
      window.electronAPI.pose.getOptions(characterId),
      window.electronAPI.touch.getOptions(characterId),
      window.electronAPI.touch.getActiveInteractions(characterId)
    ])
    setMenu({
      x,
      y,
      openUp: false,
      submenuSide: 'right',
      items: [
        { label: 'Touch', childLabel: 'Target Part', children: buildTouchMenu(characterId, touch) },
        ...(activeTouches.length > 0
          ? [{ label: 'StopTouch', childLabel: 'Active', children: buildStopTouchMenu(characterId, activeTouches) }]
          : []),
        { label: 'Clothing', children: buildClothingItemsMenu(characterId, options) },
        { label: 'Pose', children: buildPoseMenu(characterId, poses) },
        { label: 'Move', children: buildLocationMenu(characterId, locations) },
        { label: 'Regen Avatar', onSelect: () => void window.electronAPI.avatar.regenerate(characterId) }
      ]
    })
  }

  // Player has no avatar: bottom-bar button opens the clothing items directly,
  // anchored to the button and cascading up/left.
  const openPlayerMenu = async (e: MouseEvent): Promise<void> => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const options = await window.electronAPI.clothing.getOptions(PLAYER_CHARACTER_ID)
    setMenu({
      x: rect.left,
      y: rect.top,
      openUp: true,
      submenuSide: 'right',
      items: buildClothingItemsMenu(PLAYER_CHARACTER_ID, options)
    })
  }

  // Player Move button: bottom-bar button opens the move destinations directly,
  // anchored to the button and cascading up/right.
  const openPlayerMoveMenu = async (e: MouseEvent): Promise<void> => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const locations = await window.electronAPI.location.getOptions(PLAYER_CHARACTER_ID)
    setMenu({
      x: rect.left,
      y: rect.top,
      openUp: true,
      submenuSide: 'right',
      items: buildLocationMenu(PLAYER_CHARACTER_ID, locations)
    })
  }

  // Player Pose button: bottom-bar button opens the available poses directly,
  // anchored to the button and cascading up/right.
  const openPlayerPoseMenu = async (e: MouseEvent): Promise<void> => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const poses = await window.electronAPI.pose.getOptions(PLAYER_CHARACTER_ID)
    setMenu({
      x: rect.left,
      y: rect.top,
      openUp: true,
      submenuSide: 'right',
      items: buildPoseMenu(PLAYER_CHARACTER_ID, poses)
    })
  }

  // Player Touch button: bottom-bar button opens the touch cascade directly,
  // anchored to the button and cascading up/right, root headed "Target Part".
  const openPlayerTouchMenu = async (e: MouseEvent): Promise<void> => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const touch = await window.electronAPI.touch.getOptions(PLAYER_CHARACTER_ID)
    setMenu({
      x: rect.left,
      y: rect.top,
      openUp: true,
      submenuSide: 'right',
      label: 'Target Part',
      items: buildTouchMenu(PLAYER_CHARACTER_ID, touch)
    })
  }

  // Player Stop Touch button: lists the touch interactions active on the player's
  // body; selecting one requests stopping it.
  const openPlayerStopTouchMenu = async (e: MouseEvent): Promise<void> => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const active = await window.electronAPI.touch.getActiveInteractions(PLAYER_CHARACTER_ID)
    setMenu({
      x: rect.left,
      y: rect.top,
      openUp: true,
      submenuSide: 'right',
      label: 'Active Touches',
      items: buildStopTouchMenu(PLAYER_CHARACTER_ID, active)
    })
  }

  // Wrapper element per character avatar, used for FLIP relayout animation.
  const avatarEls = new Map<string, HTMLElement>()
  // In-flight relayout glides, so a rapid second relayout cancels the prior one
  // (no stacked transforms / stale baselines) without touching CSS enter/exit.
  const relayoutAnims = new WeakMap<HTMLElement, Animation>()

  // FLIP relayout: when the avatar row changes (`space-evenly` re-centers the
  // items), glide the surviving avatars from their old positions to the new ones.
  // Measure each survivor's real rect immediately before AND after the mutation —
  // Solid applies the `<For>` DOM update synchronously inside `mutate()`, so the
  // "after" rect is already reflowed — making the delta correct by construction
  // (no reliance on stored baselines or effect ordering). `animate=false` snaps
  // (player-move under the scene fade). New avatars have no "before" rect and get
  // their CSS slide-in instead; mid-exit avatars are left to their fade-out.
  const relayout = (mutate: () => void, animate: boolean): void => {
    if (!animate) {
      mutate()
      return
    }
    const first = new Map<string, DOMRect>()
    for (const [id, el] of avatarEls) {
      if (el.classList.contains('is-exiting')) continue
      relayoutAnims.get(el)?.cancel()
      first.set(id, el.getBoundingClientRect())
    }
    mutate()
    for (const [id, el] of avatarEls) {
      if (el.classList.contains('is-exiting')) continue
      const f = first.get(id)
      if (!f) continue
      const dx = f.left - el.getBoundingClientRect().left
      if (dx === 0) continue
      const anim = el.animate(
        [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }],
        { duration: AVATAR_RELAYOUT_MS, easing: AVATAR_RELAYOUT_EASING }
      )
      relayoutAnims.set(el, anim)
    }
  }

  onMount(() => {
    reset() // fresh message list for this chat
    clearAvatars() // fresh avatars for this chat

    // The avatars row sizes to its tallest image, so its top edge floats. Track
    // its height and expose it as --avatars-height on the page root; the CSS pins
    // .chat-messages' bottom to the avatars' top via that var. Border-box height
    // ignores the speaking-emphasis scale transform, so it doesn't jitter — but
    // the active speaker scales to AVATAR_SPEAKING_SIZE_PERCENT (bottom-anchored,
    // grows upward), so reserve the grown height up front to clear it when talking.
    const avatarsResize = new ResizeObserver((entries) => {
      const h = entries[0]?.borderBoxSize?.[0]?.blockSize ?? avatarsRowEl.offsetHeight
      const reserved = h * (AVATAR_SPEAKING_SIZE_PERCENT / 100)
      chatPageEl.style.setProperty('--avatars-height', `${reserved}px`)
    })
    avatarsResize.observe(avatarsRowEl)
    onCleanup(() => avatarsResize.disconnect())
    setSceneFading(false) // fresh transition state for this chat
    setSceneBlack(false)
    const unsubscribe = window.electronAPI.chat.onMessage((message) => {
      upsertFinalText(message)
      if (message.role === 'user') setPartialText('')
    })
    onCleanup(unsubscribe)

    const unsubPartial = window.electronAPI.chat.onPartial((text) => {
      setPartialText(text)
    })
    onCleanup(unsubPartial)

    // Generated images: avatars are demuxed per character (upserted by id), the
    // background fills the page. During a scene-change fade-to-black we buffer avatar
    // adds/removes and apply them only once the screen is black (on fade-out), so NPCs
    // don't visibly pop in/out against the old scene before/while it fades.
    const pendingAvatarOps: Array<() => void> = []
    const runAvatarOp = (op: () => void): void => {
      if (sceneFading()) pendingAvatarOps.push(op)
      else op()
    }
    const unsubAvatar = window.electronAPI.avatar.onGenerated((event) => {
      runAvatarOp(() =>
        relayout(() => setAvatar(event.characterId, event.url, event.useFade), event.useFade)
      )
    })
    const unsubAvatarRemoved = window.electronAPI.avatar.onRemoved((characterId, useFade) => {
      runAvatarOp(() => {
        if (!useFade) {
          // Player-move (under the scene fade): snap survivors, no glide.
          relayout(() => spliceAvatar(characterId), false)
          return
        }
        // NPC walked out: fade it in place (survivors frozen), then once it's
        // gone glide the survivors to their new spots.
        markAvatarExiting(characterId)
        setTimeout(() => relayout(() => spliceAvatar(characterId), true), AVATAR_FADE_MS)
      })
    })
    const unsubBackground = window.electronAPI.background.onGenerated((event) => {
      setBackgroundImage(event.url)
    })
    // Scene-change transition: fade to black while the new background generates.
    const unsubTransitionShow = window.electronAPI.background.onTransitionShow(() => {
      setSceneBlack(false)
      setSceneFading(true)
    })
    const unsubTransitionHide = window.electronAPI.background.onTransitionHide(() => {
      // Apply buffered avatar changes while still black, then fade out to reveal them.
      for (const op of pendingAvatarOps) op()
      pendingAvatarOps.length = 0
      setSceneBlack(false)
      setSceneFading(false)
    })
    onCleanup(unsubAvatar)
    onCleanup(unsubAvatarRemoved)
    onCleanup(unsubBackground)
    onCleanup(unsubTransitionShow)
    onCleanup(unsubTransitionHide)

    // Replay images generated before this page mounted (e.g. cache hits fired at
    // scenario start, whose live events we missed). Subscribe first (above), then
    // replay — generation is slow enough there's no realistic race.
    void window.electronAPI.avatar.list().then((list) => {
      for (const a of list) setAvatar(a.characterId, a.url, a.useFade)
    })
    void window.electronAPI.background.current().then((url) => {
      if (url) setBackgroundImage(url)
    })
  })

  const performQuit = (): void => {
    setShowQuitConfirm(false)
    void window.electronAPI.chat.quit()
    navigate(-1)
  }

  const send = (text: string): void => {
    // Echo the typed message immediately — Voxta only echoes recognized speech,
    // not typed text, so there's no duplicate from the server.
    upsertFinalText({
      messageId: `typed-${Date.now()}-${typedSeq++}`,
      senderId: 'user',
      senderName: '',
      text,
      role: 'user'
    })
    void window.electronAPI.chat.send(text)
  }

  return (
    <div class="chat-page" ref={chatPageEl}>
      <Show when={backgroundImage()}>
        {(src) => <img class="chat-background" src={src()} alt="" />}
      </Show>

      <div
        class="chat-transition"
        classList={{ 'is-active': sceneFading() }}
        style={`--bg-transition-ms:${BACKGROUND_TRANSITION_FADE_MS}ms`}
        onTransitionEnd={(e) => {
          // The fade-in just reached solid black (ignore the fade-out, where
          // sceneFading is already false). Unblocks the gated loading spinner.
          if (e.propertyName === 'opacity' && sceneFading()) setSceneBlack(true)
        }}
      />



      <GameClock hidden={headerOpen()} />

      <div class="chat-header-wrap">
        <div class="chat-header-bar" classList={{ 'is-open': headerOpen() }}>
          <button class="chat-quit-btn" onClick={() => setShowQuitConfirm(true)}>
            Quit
          </button>
          <button
              class="chat-audio-btn"
              title="Save game"
              onClick={() => setShowSaveModal(true)}
            >
              Save
            </button>
          <div class="chat-audio-controls">
            
            <button
              class="chat-audio-btn"
              classList={{ 'is-muted': speakerMuted(), 'is-active': playbackStatus() === 'playing' }}
              title={speakerMuted() ? 'Unmute speaker' : 'Mute speaker'}
              onClick={() => setSpeakerMuted((m) => !m)}
            >
              {speakerMuted() ? 'Speaker off' : 'Speaker on'}
            </button>
            <button
              class="chat-audio-btn"
              classList={{ 'is-active': showImagePanel() }}
              title="Image generation settings"
              onClick={() => setShowImagePanel((v) => !v)}
            >
              Image
            </button>
            <button
              class="chat-audio-btn"
              title="Regenerate the background image"
              onClick={() => void window.electronAPI.background.regenerate()}
            >
              Regen Background
            </button>
          </div>
        </div>
        <div class="chat-header-handle-holder">
          <div class="chat-header-handle" onClick={() => setHeaderOpen((v) => !v)} />
        </div>

      </div>

      <Show when={showImagePanel()}>
        <div class="chat-image-panel">
          <ImageConfigForm showRecalculate />
        </div>
      </Show>


      <div class="avatars" ref={avatarsRowEl}>
        <For each={avatars}>
          {(avatar) => {
            onCleanup(() => avatarEls.delete(avatar.characterId))
            return (
              <ChatAvatar
                characterId={avatar.characterId}
                src={avatar.src}
                fadeIn={avatar.fadeIn}
                exiting={avatar.exiting}
                ref={(el) => avatarEls.set(avatar.characterId, el)}
                onContextMenu={(id, x, y) => void openAvatarMenu(id, x, y)}
              />
            )
          }}
        </For>
      </div>
      <div class="chat-messages" style={`--char-fade-ms:${CHAR_FADE_MS}ms`} ref={messagesEl}>
        <For each={messages}>
          {(message) => {
            const view = (): MessageView | null => viewOf(message)
            return (
              <Show when={view()}>
                {(v) => (
                  <div class="chat-message-group" classList={{ 'is-user': message.role === 'user' }}>
                    <Show when={message.role === 'character' && message.senderName}>
                      <div class="chat-author-label">{message.senderName}</div>
                    </Show>
                    <div class="chat-message">
                      <span>{v().revealed}</span>
                      <Show when={v().playing}>
                        <CharReveal text={v().playing} duration={v().duration} />
                      </Show>
                      <Show when={v().interrupted}>
                        <span> *Interrupted*</span>
                      </Show>
                    </div>
                  </div>
                )}
              </Show>
            )
          }}
        </For>
      </div>
      <div class="chat-footer">
        <button
          class="chat-clothing-btn"
          title="Change your clothing"
          onClick={(e) => void openPlayerMenu(e)}
        >
          Clothing
        </button>
        <button
          class="chat-move-btn"
          title="Move to a nearby location"
          onClick={(e) => void openPlayerMoveMenu(e)}
        >
          Move
        </button>
        <button
          class="chat-pose-btn"
          title="Change your pose"
          onClick={(e) => void openPlayerPoseMenu(e)}
        >
          Pose
        </button>
        <button
          class="chat-touch-btn"
          title="Touch interaction"
          onClick={(e) => void openPlayerTouchMenu(e)}
        >
          Touch
        </button>
        <button
          class="chat-stoptouch-btn"
          title="Stop an active touch interaction"
          onClick={(e) => void openPlayerStopTouchMenu(e)}
        >
          Stop Touch
        </button>
        <ChatInputBox onSend={send} partialText={partialText()} />
        <button
          class="chat-mic-btn"
          classList={{ 'is-muted': micMuted(), 'is-active': recordingStatus() === 'listening' }}
          title={micMuted() ? 'Unmute microphone' : 'Mute microphone'}
          onClick={() => setMicMuted((m) => !m)}
          innerHTML={microphoneSvg}
        />
      </div>

      <Show when={menu()}>
        {(m) => (
          <ContextMenu
            x={m().x}
            y={m().y}
            items={m().items}
            openUp={m().openUp}
            submenuSide={m().submenuSide}
            label={m().label}
            onClose={() => setMenu(null)}
          />
        )}
      </Show>

      <Show when={showSaveModal()}>
        <SaveSlotModal scenarioId={scenarioId() ?? ''} onClose={() => setShowSaveModal(false)} />
      </Show>

      <Show when={showQuitConfirm()}>
        <ConfirmModal
          title="Quit to menu?"
          message="Remember to save your progress first — any unsaved progress will be lost."
          confirmLabel="Quit anyway"
          danger
          onConfirm={performQuit}
          onCancel={() => setShowQuitConfirm(false)}
        />
      </Show>

      <AudioController />
    </div>
  )
}
