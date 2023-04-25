// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

// codegen doesn't understand ArrayBuffers, so we need to map them to Objects
type JSIArrayBuffer = Object;
interface Spec extends TurboModule {
  // filesystem utils
  +writeBufferToFile: (path: string, data: JSIArrayBuffer) => Promise<void>;
  +readBufferFromFile: (path: string) => Promise<JSIArrayBuffer>;
  +base64EncodeBuffer: (data: JSIArrayBuffer) => string;
  // crypto utils
  +sha256: (data: JSIArrayBuffer) => string;
}

// for public interface, we use the correct types
export interface UtilsModuleSpec {
  +writeBufferToFile: (path: string, data: ArrayBuffer) => Promise<void>;
  +readBufferFromFile: (path: string) => Promise<ArrayBuffer>;
  +base64EncodeBuffer: (data: ArrayBuffer) => string;
  +sha256: (data: ArrayBuffer) => string;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommUtilsTurboModule',
): Spec);
