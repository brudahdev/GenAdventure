import { createSignal, createEffect, on } from 'solid-js'
import type { JSX } from 'solid-js'

interface ChatInputBoxProps {
  /** Called with the trimmed message text when the user sends a non-empty message. */
  onSend: (text: string) => void
  /** Partial ASR text to append whenever it changes (deferred — skips initial mount). */
  partialText?: string
}

/**
 * Fixed, centered chat composer pinned to the bottom of the ChatPage: a text
 * field on the left and a green send button on the right. Sending a blank
 * message is a no-op; the field clears after a successful send.
 */
export default function ChatInputBox(props: ChatInputBoxProps): JSX.Element {
  const [text, setText] = createSignal('')

  createEffect(on(
    () => props.partialText,
    (partial) => { setText(partial ?? '') },
    { defer: true }
  ))

  const send = (): void => {
    const value = text().trim()
    if (!value) return
    props.onSend(value)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div class="chat-input-box">
      <input
        class="chat-input-field"
        type="text"
        placeholder="Type a message…"
        value={text()}
        onInput={(e) => setText(e.currentTarget.value)}
        onKeyDown={onKeyDown}
      />
      <button class="chat-send-btn" onClick={send}>
        ➔
      </button>
    </div>
  )
}
