// @flow

import * as React from 'react';

import { imageAssetMetaData, assetMetaData } from './asset-meta-data.js';
import CompetitorComparison from './competitor-comparison.react.js';
import Hero from './hero.react.js';
import InfoBlock from './info-block.react.js';
import RequestAccess from './request-access.react.js';
import usePreloadImageAssets from './use-pre-load-image-assets.react.js';

function AppLanding(): React.Node {
  usePreloadImageAssets(imageAssetMetaData);
  const [hero] = imageAssetMetaData;
  const [keyserver, team] = assetMetaData;

  return (
    <main>
      <Hero {...hero} />
      <CompetitorComparison />
      <InfoBlock {...keyserver} />
      <InfoBlock {...team} />
      <RequestAccess />
    </main>
  );
}

export default AppLanding;
