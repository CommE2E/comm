// @flow

import * as React from 'react';

import { assetMetaData } from './asset-meta-data';
import HeroContent from './hero-content.react';
import InfoBlock from './info-block.react';
import Picture from './Picture.react';
import StarBackground from './star-background.react';
import usePreloadAssets from './use-pre-load-assets.react';

function AppLanding(): React.Node {
  usePreloadAssets(assetMetaData);
  const [
    hero,
    federated,
    customizable,
    encrypted,
    sovereign,
    openSource,
    lessNoisy,
  ] = assetMetaData;

  return (
    <>
      <StarBackground />
      <Picture url={hero.url} alt={hero.alt} />
      <HeroContent />
      <InfoBlock {...federated} />
      <InfoBlock {...customizable} />
      <InfoBlock {...encrypted} />
      <InfoBlock {...sovereign} />
      <InfoBlock {...openSource} />
      <InfoBlock {...lessNoisy} />
    </>
  );
}

export default AppLanding;
