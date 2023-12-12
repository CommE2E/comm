// @flow

import { requireNativeModule } from 'expo-modules-core';
import invariant from 'invariant';

const platformUtilsModule: {
  +generateThumbHash: (photoURI: string) => Promise<string>,
} = requireNativeModule('Thumbhash');

const newLineRegex = /\n/g;
async function generateThumbHash(photoURI: string): Promise<string> {
  invariant(
    platformUtilsModule.generateThumbHash,
    'generateThumbHash() unavailable. Check if Thumbhash expo-module is autolinked',
  );

  const rawThumbHash = await platformUtilsModule.generateThumbHash(photoURI);

  // Sometimes native base64 modules encode the string with newlines,
  // which breaks the thumbhash format
  return rawThumbHash.replace(newLineRegex, '');
}

export { generateThumbHash };
