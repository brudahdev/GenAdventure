import type { DependencyContainer } from "tsyringe";
import type { Remote } from "comlink";
import type { MainApi, SaveDocument, SimStartData } from "@gen-adventure/shared";
import { REMOTE_MAIN } from "../bridge/remoteMain";
import { RUN_CONTAINER } from "./runContainer";
import { RESTORE_SOURCE, RestoreSource } from "../save/RestoreSource";
import { TIME_CONFIG_ADAPTER, FileTimeConfigAdapter } from "../time/TimeConfigAdapter";
import { LOCATION_CONFIG_ADAPTER, FileLocationConfigAdapter } from "../../game/location/LocationConfigAdapter";
import { ROLE_CONFIG_ADAPTER, FileRoleConfigAdapter } from "../../game/character/RoleConfigAdapter";
import { CHARACTER_CONFIG_ADAPTER, FileCharacterConfigAdapter } from "../../game/character/CharacterConfigAdapter";
import { APPEARANCE_CONFIG_ADAPTER, FileAppearanceConfigAdapter } from "../../game/character/appearance/AppearanceConfigAdapter";
import { POSE_CONFIG_ADAPTER, FilePoseConfigAdapter } from "../../game/character/pose/PoseConfigAdapter";
import { STARTING_STATE_ADAPTER, RoleStartingStateAdapter } from "../../game/character/StartingStateAdapter";
import { STARTING_CLOTHING_ADAPTER, OutfitStartingClothingAdapter } from "../../game/character/clothing/StartingClothingAdapter";
import { INIT_CHARACTERS } from "../../game/entity/initCharacters";
import { CLOTHING_ITEM_CONFIG_ADAPTER, FileClothingItemConfigAdapter } from "../../game/item/clothing/ClothingItemConfigAdapter";
import { FileOutfitConfigAdapter, OUTFIT_CONFIG_ADAPTER } from "../../game/item/clothing/OutfitConfigAdapter";

/** A run's composition seam: registers the concrete adapter set and run-scoped
 *  values into a fresh child container, then `SimWorld` (and the rest of the
 *  graph) is resolved from the scope.
 *
 *  Start and resume share one path: every config adapter is sourced from on-disk
 *  scenario config (the fresh-start defaults), and the only difference is the
 *  {@link RestoreSource} — `null` for a fresh start, the loaded {@link SaveDocument}
 *  for a resume. Components/systems overlay their saved blob (if any) on top of
 *  their default through that single seam, so there are no per-aspect "saved"
 *  adapters. */
export class SimProvisioner {
    constructor(
        private readonly initData: SimStartData,
        private readonly main: Remote<MainApi>,
        /** The save to restore from, or `null` for a fresh start. */
        private readonly snapshot: SaveDocument | null,
    ) { }

    provision(scope: DependencyContainer): void {
        const { scenarioId, scenariosConfigDirectory } = this.initData

        scope.register(RUN_CONTAINER, { useValue: scope })
        scope.register(REMOTE_MAIN, { useValue: this.main })
        scope.register(INIT_CHARACTERS, { useValue: this.initData.characters })
        scope.register(RESTORE_SOURCE, { useValue: new RestoreSource(this.snapshot) })

        scope.register(TIME_CONFIG_ADAPTER, {
            useValue: new FileTimeConfigAdapter(scenariosConfigDirectory, scenarioId)
        })
        scope.register(LOCATION_CONFIG_ADAPTER, {
            useValue: new FileLocationConfigAdapter(scenariosConfigDirectory, scenarioId)
        })
        scope.register(CHARACTER_CONFIG_ADAPTER, {
            useValue: new FileCharacterConfigAdapter(this.initData.charactersConfigDirectory)
        })
        scope.register(APPEARANCE_CONFIG_ADAPTER, {
            useValue: new FileAppearanceConfigAdapter(this.initData.appearanceConfigLocation)
        })
        scope.register(POSE_CONFIG_ADAPTER, {
            useValue: new FilePoseConfigAdapter(this.initData.poseConfigLocation)
        })
        scope.register(CLOTHING_ITEM_CONFIG_ADAPTER, {
            useValue: new FileClothingItemConfigAdapter(this.initData.clothingItemConfigLocation)
        })
        const outfitConfigAdapter = new FileOutfitConfigAdapter(this.initData.outfitConfigLocation)
        scope.register(OUTFIT_CONFIG_ADAPTER, { useValue: outfitConfigAdapter })

        const roleConfigAdapter = new FileRoleConfigAdapter(scenariosConfigDirectory, scenarioId)
        scope.register(ROLE_CONFIG_ADAPTER, { useValue: roleConfigAdapter })

        const roleStartingState = new RoleStartingStateAdapter(roleConfigAdapter, this.initData.characters)
        scope.register(STARTING_STATE_ADAPTER, { useValue: roleStartingState })
        scope.register(STARTING_CLOTHING_ADAPTER, {
            useValue: new OutfitStartingClothingAdapter(roleStartingState, outfitConfigAdapter)
        })
    }
}
