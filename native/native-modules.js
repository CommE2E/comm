// @flow

import type { Spec as CoreModuleSpec } from './schema/CommCoreModuleSchema.js';
import type { UtilsModuleSpec } from './schema/CommUtilsModuleSchema.js';
import type { Spec as ValidationModuleSpec } from './schema/CommValidationModuleSchema.js';

export const commCoreModule: CoreModuleSpec = global.CommCoreModule;
export const commUtilsModule: UtilsModuleSpec = global.CommUtilsModule;
export const commValidationModule: ValidationModuleSpec =
  global.CommValidationModule;
