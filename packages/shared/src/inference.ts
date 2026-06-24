/**
 * Bridge models for the inference-action system. The sim defines actions and
 * decodes invocations; main maps these to/from Voxta wire DTOs. They live in
 * shared because both the `SimApi`/`MainApi` boundary and the main process
 * reference them — the sim's `InferenceActionManager` produces `InferenceAction`
 * and consumes `InferenceInvocation`.
 */

/** A character action advertised to Voxta. `layer` is the action layer
 *  (e.g. "act"); `before` selects pre- vs post-message timing (see the main-side
 *  timing mapper). */
export interface InferenceAction {
  characterId: string;
  name: string;
  description: string;
  layer: string;
  before: boolean;
  arguments?: InferenceArgument[];
  shortDescription?: string;
  disabled: boolean;
}

export interface InferenceArgument {
  name: string;
  type: InferenceArgumentType;
  description?: string;
  required?: boolean;
}

export type InferenceArgumentType = 'Undefined' | 'String' | 'Integer' | 'Double' | 'Boolean';

/** An action fired by Voxta, identified by `value` (`action:<name>`), carrying
 *  the raw string arguments the sim decodes against the action's schema. */
export interface InferenceInvocation {
  value: string;
  arguments?: InferenceInvocationArgument[];
}

export interface InferenceInvocationArgument {
  name: string;
  value: string;
}
