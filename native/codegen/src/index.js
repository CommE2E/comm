/**
 * @flow strict-local
 * @format
 */
import path from 'path';

import codeGen from './CodeGen.js';
('use strict');

const outPath = path.resolve('./cpp/CommonCpp/_generated');

// CommCoreModule
const coreModuleSchemaPath = path.resolve('./schema/CommCoreModuleSchema.js');
codeGen('comm', coreModuleSchemaPath, ['cpp', 'h'], outPath);

// CommUtilsModule
const utilsModuleSchemaPath = path.resolve('./schema/CommUtilsModuleSchema.js');
codeGen('utils', utilsModuleSchemaPath, ['cpp', 'h'], outPath);
