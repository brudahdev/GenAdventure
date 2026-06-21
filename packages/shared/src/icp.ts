export const ICP = {
    SCENARIO_LIST: 'scenario:list',
    SCENARIO_START: 'scenario:start',
    SCENARIO_SAVE: 'scenario:save',   // renderer → main (invoke): persist(saveName, slot)
    SCENARIO_LOAD: 'scenario:load',   // renderer → main (invoke): loadGame(gameJsonPath)
    SAVE_SLOT_LIST: 'save-slot:list', // renderer → main (invoke): list all saves on disk
    CHAT_SEND: 'chat:send',
    CHAT_QUIT: 'chat:quit',
    CHAT_MESSAGE: 'chat:message',
    CHAT_PARTIAL: 'chat:partial',             // main → renderer (send)
    // Audio: streamed TTS playback + mic voice input
    AUDIO_PLAY: 'audio:play',                     // main → renderer (send)
    AUDIO_REPLY_END: 'audio:reply-end',           // main → renderer (send): { messageId }
    AUDIO_STOP: 'audio:stop',                     // main → renderer (send)
    AUDIO_STARTED: 'audio:started',               // renderer → main (invoke)
    AUDIO_COMPLETE: 'audio:complete',             // renderer → main (invoke)
    AUDIO_RECORDING_START: 'audio:recording-start', // main → renderer (send)
    AUDIO_RECORDING_STOP: 'audio:recording-stop',   // main → renderer (send)
    CHARACTERS_LIST: 'characters:list',
    CONFIG_DATA_READ: 'data:read',
    CONFIG_DATA_WRITE: 'data:write',
    CONFIG_DATA_COPY_DIR: 'data:copy-dir',
    VOA_CONFIG_GET: 'voxta-config:get',
    VOA_CONFIG_SET: 'voxta-config:set',
    // Image generation: generated images pushed main → renderer; on/off settings.
    AVATAR_GENERATED: 'avatar:generated',         // main → renderer (send)
    AVATAR_REMOVED: 'avatar:removed',             // main → renderer (send): payload AvatarRemovedEvent
    AVATAR_LIST: 'avatar:list',                   // renderer → main (invoke): replay snapshot
    AVATAR_REGENERATE: 'avatar:regenerate',       // renderer → main (invoke): re-roll a character's avatar
    BACKGROUND_GENERATED: 'background:generated', // main → renderer (send)
    BACKGROUND_CURRENT: 'background:current',     // renderer → main (invoke): replay snapshot
    BACKGROUND_REGENERATE: 'background:regenerate', // renderer → main (invoke): re-roll the background
    BACKGROUND_TRANSITION_SHOW: 'background:transition-show', // main → renderer (send): fade scene to black
    BACKGROUND_TRANSITION_HIDE: 'background:transition-hide', // main → renderer (send): fade scene back in
    IMG_GEN_SETTINGS_GET: 'image-gen:settings:get',
    IMG_GEN_SETTINGS_SET: 'image-gen:settings:set',
    IMG_GEN_RECALCULATE: 'image-gen:recalculate', // re-apply transparency to all avatars
    IMG_GEN_RECALCULATE_BACKGROUND: 'image-gen:recalculate-background', // re-apply blur to the background
    // ComfyUI provider config
    COMFY_SETTINGS_GET: 'comfy:settings:get',
    COMFY_SETTINGS_SET: 'comfy:settings:set',
    COMFY_WORKFLOWS_LIST: 'comfy:workflows:list',
    COMFY_WORKFLOW_LOAD: 'comfy:workflow:load',   // opens native file dialog
    COMFY_WORKFLOW_PATHS: 'comfy:workflow:paths',
    COMFY_BINDINGS_GET: 'comfy:bindings:get',
    COMFY_BINDINGS_SET: 'comfy:bindings:set',
    // Loading overlay: main → renderer (send)
    OVERLAY_SHOW: 'overlay:show',  // payload: string | null
    OVERLAY_HIDE: 'overlay:hide',
    // Game time: main → renderer (send); renderer → main (invoke)
    TIME_UPDATE: 'time:update',    // main → renderer (send), payload: number (ms timestamp)
    TIME_PAUSE:  'time:pause',     // renderer → main (invoke)
    TIME_RESUME: 'time:resume',    // renderer → main (invoke)
    // Clothing: renderer → main (invoke)
    CLOTHING_OPTIONS_GET: 'clothing:options:get',     // get state-change options for a character
    CLOTHING_STATE_CHANGE: 'clothing:state-change',   // request a clothing item state change
    // Location: renderer → main (invoke)
    LOCATION_OPTIONS_GET: 'location:options:get',     // get the player's nearby-location options
    LOCATION_MOVE: 'location:move',                   // request a character move to a nearby location
    // Pose: renderer → main (invoke)
    POSE_OPTIONS_GET: 'pose:options:get',             // get a character's available pose options
    POSE_SET: 'pose:set',                             // request a character pose change
    // Touch: renderer → main (invoke)
    TOUCH_OPTIONS_GET: 'touch:options:get',           // get a character's available touch options
    TOUCH_ACTION: 'touch:action'                      // request a character touch interaction
} as const