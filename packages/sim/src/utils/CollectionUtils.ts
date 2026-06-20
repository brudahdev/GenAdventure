import { Taggable } from "@gen-adventure/shared";

export function findFirstWithTag<T extends Taggable>(
    tagKey: string,
    collection: T[]
): T | undefined {

    return collection.find(item => matchesTaggable(tagKey, item));
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