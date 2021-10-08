/**
 * @flow strict-local
 * @format
 */
import path from 'path';

import codeGen from './CodeGen.js';
('use strict');

const schemaInPath = path.resolve('./schema/CommCoreModuleSchema.js');
const outPath = path.resolve('./cpp/CommonCpp/_generated');

codeGen('comm', schemaInPath, ['cpp', 'h'], outPath);
