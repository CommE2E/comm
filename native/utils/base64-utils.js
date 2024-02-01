// @flow

import { commUtilsModule } from '../native-modules.js';

function base64EncodeString(value: string): string {
  const buffer = commUtilsModule.encodeStringToUTF8ArrayBuffer(value);
  return commUtilsModule.base64EncodeBuffer(buffer);
}

export { base64EncodeString };
