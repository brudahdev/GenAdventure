import { Component } from "../../../core/ec/Component";
import { Entity } from "../../../core/ec/Entity";
import { defineKey } from "../../../core/ec/ComponentKey";
import { defineFactory } from "../../../core/ec/ComponentFactory";
import { CharacterIdentityKey } from "../identity/CharacterIdentity";
import { BodyPart } from "./BodyPart";
import { Hands } from "./parts/Hands";
import { Tits } from "./parts/Tits";
import { Nipples } from "./parts/Nipples";
import { Ass } from "./parts/Ass";
import { Anus } from "./parts/Anus";
import { Face } from "./parts/Face";
import { Feet } from "./parts/Feet";
import { Head } from "./parts/Head";
import { Hips } from "./parts/Hips";
import { Mouth } from "./parts/Mouth";
import { Neck } from "./parts/Neck";
import { Shoulders } from "./parts/Shoulders";
import { Thighs } from "./parts/Thighs";
import { Penis } from "./parts/Penis";
import { Pussy } from "./parts/Pussy";

export const BodyKey = defineKey<Body>("character.body")
export const bodyFactory = defineFactory(BodyKey, (entity) => new Body(entity))

/** A character's anatomy: an ordered bag of {@link BodyPart}s. Which parts attach
 *  depends on the character's config (`hasTits` / `hasPenis`). Parts are addressed
 *  by name via {@link getPart} — the touch interaction configs name them with
 *  `keyof Body` (e.g. `'hands'`, `'penis'`). */
export class Body implements Component {
    bodyParts: BodyPart[] = []

    // Universal parts.
    hands: Hands;
    ass: Ass;
    anus: Anus;
    face: Face;
    feet: Feet;
    head: Head;
    hips: Hips;
    mouth: Mouth;
    neck: Neck;
    shoulders: Shoulders;
    thighs: Thighs;

    // Anatomy-dependent parts.
    tits?: Tits;
    nipples?: Nipples;
    penis?: Penis;
    pussy?: Pussy;

    constructor(
        private readonly entity: Entity
    ) {
        const config = entity.get(CharacterIdentityKey)?.config

        this.hands = new Hands(this, this.entity);
        this.ass = new Ass(this, this.entity);
        this.anus = new Anus(this, this.entity);
        this.face = new Face(this, this.entity);
        this.feet = new Feet(this, this.entity);
        this.head = new Head(this, this.entity);
        this.hips = new Hips(this, this.entity);
        this.mouth = new Mouth(this, this.entity);
        this.neck = new Neck(this, this.entity);
        this.shoulders = new Shoulders(this, this.entity);
        this.thighs = new Thighs(this, this.entity);

        if (config?.hasTits) {
            this.tits = new Tits(this, this.entity);
            this.nipples = new Nipples(this, this.entity);
        }
        if (config?.hasPenis) {
            this.penis = new Penis(this, this.entity);
        } else {
            this.pussy = new Pussy(this, this.entity);
        }
    }

    init() {
    }

    addPart(part: BodyPart) {
        this.bodyParts.push(part)
    }

    /** Resolves a named body part (`'hands'`, `'penis'`, …). Returns `undefined`
     *  when the character lacks that part or the name is not a part field. The
     *  `instanceof BodyPart` guard keeps callers (e.g. {@link TouchManager}) from
     *  treating methods/arrays as parts. */
    getPart(name: keyof Body): BodyPart | undefined {
        const part = this[name];
        return part instanceof BodyPart ? part : undefined;
    }
}
