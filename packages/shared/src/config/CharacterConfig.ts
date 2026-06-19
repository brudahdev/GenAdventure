export interface CharacterConfig {
    pronouns: PronounsConfig;
    personalityId?: string;
    appearanceEntryIds: string[];
    hasTits?: boolean;
    hasVagina?: boolean;
    hasPenis?: boolean;

    arousalData: ArousalData;
}

export interface PlayerConfig extends CharacterConfig {
    personaId: string;
}

export interface PronounsConfig {
    heShe: string;
    himHer: string;
    hisHer: string;
}


export interface ArousalData {
    //tto = time to orgasm
    manual_boner?: boolean// only for player with penis. ignores auto_boner_orgasm_percent
    manual_ejaculate?: boolean; // only for player with penis. can cum at any time
    auto_boner_orgasm_percent?: number; // only for penis character
    boner_after_sexual_arousal?: number; // only for npc with penis   /////todo
    orgasm_time?: number, //only for vagina characters in seconds
    squirt_time?: number, //only for vagina characters in seconds
    vaginal_sex_tto: number,
    anal_sex_tto: number,
    fingering_tto?: number, //for vagina character
    fingering_anus_tto: number, //for anus character

    handjob_tto?: number, //for penis character
    blowjob_tto?: number, //for penis character
    tit_job_tto?: number, //for penis character
    foot_job_tto?: number, //for penis character

    handjob_mult?: number, //for hand character
    blowjob_mult?: number, //for sucking character
    tit_job_mult?: number, //for tit character
    foot_job_mult?: number, //for foot character

}

/* arousalData
    tto = time to orgasm (in minutes)
    ex: 
    vaginal_sex_tto: 2
    start at orgasm %0 -> will reach an orgasm in 2 minutes of vaginal sex.

    They stack. 
    ex:
    fingering_tto: 2,
    anal_sex_tto: 2,
    start at orgasm %0 -> will reach an orgasm in 1 minute of anal sex and fingering.

    netagive values are permissible and they lower orgasm%


    mult = multiplier applied to orgasm% delta computed from tto
    orgasm% = mult  * orgasm%
    negative and 0 values are ignored
    ex:
    fingering_tto: 2
    blowjob_mult: 2
    start at orgasm %0 -> will reach an orgasm in 1 minute of being fingered and giving a bj.
*/
