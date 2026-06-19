
export abstract class CharacterObserver {
    private characterListeners = new Set<(characterIds: string[]) => void>();

    subscribe(listener: (characterIds: string[]) => void): () => void {
        this.characterListeners.add(listener);

        listener(this.getCharacterIds());

        return () => {
            this.characterListeners.delete(listener);
        };
    }

    abstract getCharacterIds(): string[];

    dispose() {
        this.characterListeners.clear();
    }

    protected emit() {
        for (const listener of this.characterListeners) {
            listener(this.getCharacterIds());
        }
    }
}