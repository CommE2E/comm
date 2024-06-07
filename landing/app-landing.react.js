// @flow

import * as React from 'react';

import { imageAssetMetaData, assetMetaData } from './asset-meta-data.js';
import CompetitorComparison from './competitor-comparison.react.js';
import DifferentiationInfo from './differentiation-info.react.js';
import Hero from './hero.react.js';
import InfoBlock from './info-block.react.js';
import RequestAccess from './request-access.react.js';
import usePreloadImageAssets from './use-pre-load-image-assets.react.js';

const DISABLE_DIFFERENTIATION_INFO = false;

const differentiationInfo = DISABLE_DIFFERENTIATION_INFO ? null : (
  <DifferentiationInfo />
);

function AppLanding(): React.Node {
  usePreloadImageAssets(imageAssetMetaData);
  const [hero] = imageAssetMetaData;
  const [keyserver, team] = assetMetaData;

  return (
    <main>
      <Hero {...hero} />
      <CompetitorComparison />
      {differentiationInfo}
      <InfoBlock {...keyserver} />
      <InfoBlock {...team} />
      <RequestAccess />
    </main>
  );
}

export default AppLanding;
