import { IDable, Taggable } from "@gen-adventure/shared";

export function findFirstWithTag<T extends Taggable>(
    tagKey: string,
    collection: T[]
): T | undefined {

    for (const item of collection) {
        const match = matchesTaggable(tagKey, item)
        if (match) {
            return item;
        }
    }

    return undefined
}

export function findFirstInMapWithTag<T extends Taggable>(
    tagKey: string,
    collection: MapIterator<T>
): T | undefined {

    for (const item of collection) {
        const match = matchesTaggable(tagKey, item)
        if (match) {
            return item;
        }
    }

    return undefined
}

export function matchesTaggable(
    tagKey: string,
    item: Taggable
): boolean {

    let hasMatchingTag = false;

    // Check included tags
    if (item.tags) {
        for (const tag of item.tags) {

            if (tagKey.includes(tag)) {
                hasMatchingTag = true;
                break;
            }
        }
    }

    // Must have at least one matching include tag
    if (!hasMatchingTag) {
        return false;
    }

    // Check excluded tags
    if (item.excludeTags) {
        for (const excludeTag of item.excludeTags) {

            if (tagKey.includes(excludeTag)) {
                return false;
            }
        }
    }

    return true;
}

export function findById<T extends IDable>(id: string, collection: T[]): T | undefined {
    return collection.find(item => item.id === id);
}

export function getRandomItem<T>(items: T[]): T {
    if (items.length == 1) {
        return items[0];
    }
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
}