/**
 * @flow strict-local
 * @format
 */
import path from 'path';

import codeGen from './CodeGen.js';
('use strict');

const schemaInPath = path.resolve('./schema/DraftSchema.js');
const outPath = path.resolve('./CommonCpp/NativeModules');

codeGen('comm', schemaInPath, ['cpp', 'h'], outPath);
