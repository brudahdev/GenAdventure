export interface Notif {
    text: string
    characterIds: string[]
    actorInfo?: {
        text: string
        actorId: string
    }
}