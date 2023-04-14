// @flow

import type { Spec as CoreModuleSpec } from './schema/CommCoreModuleSchema.js';
import type { UtilsModuleSpec } from './schema/CommUtilsModuleSchema.js';

export const commCoreModule: CoreModuleSpec = global.CommCoreModule;
export const commUtilsModule: UtilsModuleSpec = global.CommUtilsModule;
