
import { TouchInteraction } from "./Touch";
import { DuoTouchInteraction } from "./TouchDuo";

export class TouchInteractionSlot<T extends TouchInteraction = TouchInteraction> {
    private interactions: T[] = [];

    private slotName: string;
    private bodyPartName: string;
    constructor(
        bodyPartName: string,
        slotName: string
    ) {
        this.bodyPartName = bodyPartName;
        this.slotName = slotName;
    }

    addInteraction(newInteraction: T): boolean {
        const dontApply = this.interactions.some(existing => {
            const rv = newInteraction.shouldNotApply(existing);
            if (rv) {
                console.log(`not applying ${newInteraction.getInteractionData().id} because  ${existing.getInteractionData().id} is active and included in dontApplyIf condition`);
            }
            return rv;
        });

        if (dontApply) {
            return false;
        }

        //user piroty logic, dont deactivate a user initiated action for an npc one.
        let userPriorityOverride = false;
        for (const interaction of this.interactions) {
            if (interaction instanceof DuoTouchInteraction) {
                const compatible = newInteraction.isCompatibleWith(interaction);
                if (compatible) {
                    continue;
                }

                const oldActorIsPlayer = false// todo get from registry entitiy interaction.args.actorId and check if player 
                const newActorIsPlayer = false// todo get from registry entitiy newInteraction.args.actorId and check if player 


                if (oldActorIsPlayer && !newActorIsPlayer) {
                    userPriorityOverride = true;
                    return false;
                }
            }
        }


        // Remove incompatible effects
        this.interactions = this.interactions.filter(existing => {
            const compatible = newInteraction.isCompatibleWith(existing);
            if (!compatible) {
                existing.deActivate();
            }
            return compatible;
        });

        // Avoid adding duplicates //todo should go first
        if (this.slotContains(newInteraction)) {
            console.log(`not applying ${newInteraction.getInteractionData().id} because it's already applied`);
            return false;
        }

        this.interactions.push(newInteraction);
        // newInteraction.setTouchInteractionSlot(this);
        return true;
    }

    slotContains(interaction: T) {
        const dupe = this.interactions.find(existingInteraction => {
            return interaction.equals(existingInteraction);
        });

        return dupe ? true : false;
    }


    removeInteraction(effect: T, callDeactivate: boolean = true) {
        const id = effect.getInteractionData().id;
        const index = this.interactions.findIndex(i => i.getInteractionData().id === id);
        if (index !== -1) {
            const [removed] = this.interactions.splice(index, 1);
            if (callDeactivate)
                removed.deActivate();
        }
    }


    getInteractions(): readonly T[] {
        return this.interactions;
    }


    clear() {
        for (const e of this.interactions) {
            e.deActivate();
        }
        this.interactions = [];
    }

    containsEffectOfType(effectClass: new (...args: any[]) => T): boolean {
        return this.interactions.some(effect => effect instanceof effectClass);
    } //todo remove this
}