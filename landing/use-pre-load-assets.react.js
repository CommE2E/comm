// @flow

import * as React from 'react';

import { type Asset } from './asset-meta-data.js';

function usePreloadAssets(assets: Asset[]) {
  React.useEffect(() => {
    const testWEBP = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
    const testImg = new Image();

    // preload webp if supported
    testImg.onload = () => {
      for (const { url } of assets) {
        const image = new Image();
        image.src = `${url}.webp`;
      }
    };

    // preload png if webp not supported
    testImg.onerror = () => {
      for (const { url } of assets) {
        const image = new Image();
        image.src = `${url}.png`;
      }
    };

    testImg.src = `data:image/webp;base64,${testWEBP}`;
  }, [assets]);
}

export default usePreloadAssets;
