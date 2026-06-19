import { createSignal } from 'solid-js'

/** Whether the character's voice is idle or actively playing a TTS chunk. */
export type PlaybackStatus = 'off' | 'playing'
/** Mic state: off (no active request), paused (muted/idle), listening (streaming). */
export type RecordingStatus = 'off' | 'paused' | 'listening'

/** User-controlled mutes (persist across the chat session). */
export const [micMuted, setMicMuted] = createSignal(false)
export const [speakerMuted, setSpeakerMuted] = createSignal(false)

/** Live status, driven by the AudioController, for indicators in the UI. */
export const [playbackStatus, setPlaybackStatus] = createSignal<PlaybackStatus>('off')
export const [recordingStatus, setRecordingStatus] = createSignal<RecordingStatus>('off')

/** True while any TTS chunk is playing or queued. Gates ordered message reveal:
 *  a character message that isn't yet voicing/settled stays hidden while this is
 *  true, so a later speaker doesn't pop up during an earlier speaker's karaoke. */
export const [audioActive, setAudioActive] = createSignal(false)

/** characterId of the avatar currently voicing a TTS chunk, or null when idle.
 *  Drives the speaking-avatar emphasis (grow the speaker, darken the rest). */
export const [speakingCharacterId, setSpeakingCharacterId] = createSignal<string | null>(null)
