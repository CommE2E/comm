// @flow

import * as React from 'react';

import { assetUrl } from './asset-meta-data';

type Asset = {
  +alt: string,
  +url: string,
  +title: string,
  +description: string,
};

function usePreloadAssets(assets: Asset[]) {
  React.useEffect(() => {
    const testWEBP = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
    const testImg = new Image();

    // preload webp if supported
    testImg.onload = () => {
      for (const { url } of assets) {
        const image = new Image();
        image.src = `${assetUrl}/${url}.webp`;
      }
    };

    // preload png if webp not supported
    testImg.onerror = () => {
      for (const { url } of assets) {
        const image = new Image();
        image.src = `${assetUrl}/${url}.png`;
      }
    };

    testImg.src = `data:image/webp;base64,${testWEBP}`;
  }, [assets]);
}

export default usePreloadAssets;
