// @flow

import type { Spec as CoreModuleSpec } from './schema/CommCoreModuleSchema.js';
import type { Spec as RustModuleSpec } from './schema/CommRustModuleSchema.js';
import type { UtilsModuleSpec } from './schema/CommUtilsModuleSchema.js';

export const commCoreModule: CoreModuleSpec = global.CommCoreModule;
export const commUtilsModule: UtilsModuleSpec = global.CommUtilsModule;
export const commRustModule: RustModuleSpec = global.CommRustModule;
export const commConstants: {
  +NATIVE_MESSAGE_TYPES: $ReadOnlyArray<number>,
} = global.CommConstants;
