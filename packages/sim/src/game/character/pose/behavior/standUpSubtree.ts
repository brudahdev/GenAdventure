/** Stand up if not already standing. Idempotent — succeeds immediately when
 *  already upright. A mistreevous named-root subtree (`branch [StandUp]`) shared
 *  by every tree that moves (goto-location, goto-character). Its leaves
 *  `IsStanding`/`Stand` are pose-agent methods, so it lives with pose. */
export const STAND_UP_SUBTREE = `
root [StandUp] {
    selector {
        condition [IsStanding]
        action [Stand]
    }
}`
