// flow
// @flow
import * as React from 'react';

type Asset = {
  +file: string,
  +alt: string,
};

export const LandingAssetsS3URL = 'https://dh9fld3hutpxf.cloudfront.net';

function usePreLoadAssets(assets: $ReadOnlyArray<Asset>): void {
  React.useEffect(() => {
    const testWEBP = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
    const testImg = new Image();

    // preload webp if supported
    testImg.onload = () => {
      for (const imageFileName of assets) {
        const image = new Image();
        image.src = `${LandingAssetsS3URL}/${imageFileName.file}.webp`;
      }
    };

    // preload png if webp not supported
    testImg.onerror = () => {
      for (const imageFileName of assets) {
        const image = new Image();
        image.src = `${LandingAssetsS3URL}/${imageFileName.file}.png`;
      }
    };

    testImg.src = `data:image/webp;base64,${testWEBP}`;
  }, [assets]);
}

export default usePreLoadAssets;
