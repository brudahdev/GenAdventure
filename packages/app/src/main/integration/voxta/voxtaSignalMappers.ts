import type { VoxtaServerMessage } from '@gen-adventure/shared'
import type { VoxtaServerMessageDto } from './voxtaSignalDtos'

/**
 * DTO → domain mapping for Voxta SignalR hub messages. The single place where
 * the wire format is translated into the domain models the rest of the app
 * consumes. The two shapes are intentionally 1:1 for now, so this is a
 * structural passthrough — but it keeps the boundary explicit, ready for the
 * day the domain shape diverges from the wire shape.
 */
export function mapServerMessage(dto: VoxtaServerMessageDto): VoxtaServerMessage {
  return dto as VoxtaServerMessage
}
