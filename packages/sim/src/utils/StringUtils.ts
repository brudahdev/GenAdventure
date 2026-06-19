export class StringUtils {
    public static capitalizeFirstLetter(val: string) {
        return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    }

    public static isAreAdverb(text: string) {
        return text.endsWith('s') ? 'are' : 'is';
    }

    public static fillTemplate(template: string, values: Record<string, string>): string {
        return template.replace(/{{(.*?)}}/g, (_, rawKey) => {
            const key = rawKey.trim();

            return values.hasOwnProperty(key) ? values[key] : `{{${key}}}`;
        });
    }
}