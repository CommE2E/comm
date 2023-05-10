// @flow

import { requireNativeModule } from 'expo-modules-core';
import invariant from 'invariant';

const platformUtilsModule: {
  +generateThumbHash: (photoURI: string) => Promise<string>,
} = requireNativeModule('Thumbhash');

async function generateThumbHash(photoURI: string): Promise<string> {
  invariant(
    platformUtilsModule.generateThumbHash,
    'generateThumbHash() unavailable. Check if Thumbhash expo-module is autolinked',
  );
  return await platformUtilsModule.generateThumbHash(photoURI);
}

export { generateThumbHash };
