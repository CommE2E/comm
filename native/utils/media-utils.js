// @flow

import type { Dimensions } from 'lib/types/media-types';

import { Image } from 'react-native';

async function preloadImage(uri: string): Promise<Dimensions> {
  const [ dimensions ] = await Promise.all([
    fetchSize(uri),
    Image.prefetch(uri),
  ]);
  return dimensions;
}

function fetchSize(uri: string): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    const success = (width, height) => resolve({ height, width });
    Image.getSize(uri, success, reject);
  });
}

export {
  preloadImage,
};
