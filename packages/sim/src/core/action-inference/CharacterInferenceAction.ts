import type {
    InferenceArgument,
    InferenceArgumentType,
    InferenceInvocationArgument,
} from "@gen-adventure/shared";
import { InferenceActionManager } from "./InferenceActionManager";


export type InferenceActionLayer = "act" | "emotion";


// ──────────────────────────────────────────────────────────────────────────
// Typed argument codec
//
// A subclass declares its arguments once as an `ArgSchema`. That single
// declaration drives both directions: `encodeArgs` advertises them to Voxta as
// `InferenceArgument[]`, and `decodeArgs` turns an incoming `name/value` string
// list back into a typed object for `handle`.
// ──────────────────────────────────────────────────────────────────────────

/** Static shape of one argument: its wire type, whether it is required, an
 *  optional default description, and how to turn its raw string into `T`. */
export interface ArgSpec<T> {
    readonly type: InferenceArgumentType;
    readonly required: boolean;
    /** Static fallback description; a dynamic one from `computeContent` wins. */
    readonly description?: string;
    decode(raw: string): T;
}

export type ArgSchema = Record<string, ArgSpec<unknown>>;

/** The typed argument object inferred from a schema, e.g.
 *  `{ target: arg.string(), n: optional(arg.integer()) }` →
 *  `{ target: string; n: number | undefined }`. */
export type InferredArgs<S extends ArgSchema> = {
    [K in keyof S]: S[K] extends ArgSpec<infer T> ? T : never;
};

interface ArgOpts {
    description?: string;
}

function makeSpec<T>(
    type: InferenceArgumentType,
    opts: ArgOpts | undefined,
    decode: (raw: string) => T,
): ArgSpec<T> {
    return { type, required: true, description: opts?.description, decode };
}

/** Declarative builders for the four Voxta argument types. */
export const arg = {
    string: (opts?: ArgOpts): ArgSpec<string> => makeSpec("String", opts, (raw) => raw),
    integer: (opts?: ArgOpts): ArgSpec<number> => makeSpec("Integer", opts, (raw) => parseInt(raw, 10)),
    double: (opts?: ArgOpts): ArgSpec<number> => makeSpec("Double", opts, (raw) => parseFloat(raw)),
    boolean: (opts?: ArgOpts): ArgSpec<boolean> => makeSpec("Boolean", opts, (raw) => raw === "true"),
};

/** Marks an argument as optional: it may be absent, and absence decodes to
 *  `undefined` instead of throwing. */
export function optional<T>(spec: ArgSpec<T>): ArgSpec<T | undefined> {
    return {
        ...spec,
        required: false,
        decode: (raw) => spec.decode(raw),
    };
}

/** Typed args → DTO list, layering dynamic per-argument descriptions over the
 *  static `ArgSpec.description` (dynamic wins). */
export function encodeArgs(
    schema: ArgSchema,
    descriptions?: Record<string, string | undefined>,
): InferenceArgument[] {
    return Object.entries(schema).map(([name, spec]) => ({
        name,
        type: spec.type,
        description: descriptions?.[name] ?? spec.description,
        required: spec.required,
    }));
}

/** Incoming `name/value` strings → typed object. Throws on a required argument
 *  that is absent or fails to parse (e.g. a non-numeric integer). */
export function decodeArgs<S extends ArgSchema>(
    schema: S,
    invocation: InferenceInvocationArgument[],
): InferredArgs<S> {
    const raw = new Map(invocation.map((a) => [a.name, a.value]));
    const out = {} as Record<string, unknown>;

    for (const name in schema) {
        const spec = schema[name];
        const value = raw.get(name);

        if (value === undefined) {
            if (spec.required) {
                throw new Error(`Inference argument "${name}" is required but was not provided`);
            }
            out[name] = undefined;
            continue;
        }

        const decoded = spec.decode(value);
        if (spec.required && typeof decoded === "number" && Number.isNaN(decoded)) {
            throw new Error(`Inference argument "${name}" could not be parsed from "${value}"`);
        }
        out[name] = decoded;
    }

    return out as InferredArgs<S>;
}


// ──────────────────────────────────────────────────────────────────────────
// CharacterInferenceAction
// ──────────────────────────────────────────────────────────────────────────

/** Fixed structural identity, set once at construction. Safe to read before the
 *  subclass body runs (no `this`-before-`super` hazard). */
export interface ActionIdentity {
    name: string;
    characterId: string;
    layer: InferenceActionLayer;
    before: boolean;
}

/** Every piece of human-readable text the action advertises. Recomputed as a
 *  unit by `computeContent` so a single state change re-syncs everything. */
export interface ActionContent<S extends ArgSchema = ArgSchema> {
    description: string;
    shortDescription?: string;
    argDescriptions?: Partial<Record<keyof S, string>>;
}

export abstract class CharacterInferenceAction<S extends ArgSchema = ArgSchema> {
    private content: ActionContent = { description: "" };

    constructor(
        private readonly identity: ActionIdentity,
        private readonly manager: InferenceActionManager,
    ) {
        // Reads identity only — subclass fields aren't initialized yet, so prose
        // is deferred to init().
        manager.registerAction(this);
    }

    /** Declarative argument schema. Subclasses pin `S` to a concrete shape,
     *  which then types `handle`/`computeContent`. Recover the shape without
     *  restating it via `type Args = typeof mySchema`. */
    abstract readonly args: S;

    /** Pure: subclasses compute all prose from current game state and return it.
     *  The base owns storing it and re-syncing — there is no setter to forget. */
    protected abstract computeContent(): ActionContent<S>;

    /** Invoked when Voxta fires this action with decoded, typed arguments. */
    abstract handle(args: InferredArgs<S>): void | Promise<void>;

    /** Second boot phase: run once the sim graph is built and `this` is ready. */
    init(): void {
        this.refresh();
    }

    /** Subclasses call this when game state affecting their text changes. */
    protected refresh(): void {
        const next = this.computeContent();
        if (sameContent(this.content, next)) return;
        this.content = next;
        this.manager.syncAction(this);
    }

    getName(): string {
        return this.identity.name;
    }
    getCharacterId(): string {
        return this.identity.characterId;
    }
    getLayer(): InferenceActionLayer {
        return this.identity.layer;
    }
    getBefore(): boolean {
        return this.identity.before;
    }
    getDescription(): string {
        return this.content.description;
    }
    getShortDescription(): string | undefined {
        return this.content.shortDescription;
    }

    /** Structural args merged with the current dynamic descriptions. */
    resolveArguments(): InferenceArgument[] {
        return encodeArgs(this.args, this.content.argDescriptions as Record<string, string | undefined>);
    }
}

/** Shallow equality of action content, used to skip redundant re-syncs. */
function sameContent(a: ActionContent, b: ActionContent): boolean {
    if (a.description !== b.description || a.shortDescription !== b.shortDescription) {
        return false;
    }

    const aDescs = a.argDescriptions ?? {};
    const bDescs = b.argDescriptions ?? {};
    const keys = new Set([...Object.keys(aDescs), ...Object.keys(bDescs)]);
    for (const key of keys) {
        if (aDescs[key] !== bDescs[key]) return false;
    }
    return true;
}
