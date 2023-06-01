// @flow

import * as React from 'react';

import { imageAssetMetaData } from './asset-meta-data.js';
import Hero from './hero.react.js';
import usePreloadImageAssets from './use-pre-load-image-assets.react.js';

function AppLanding(): React.Node {
  usePreloadImageAssets(imageAssetMetaData);
  const [hero] = imageAssetMetaData;

  return (
    <main>
      <Hero {...hero} />
    </main>
  );
}

export default AppLanding;
