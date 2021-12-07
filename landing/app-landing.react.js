// @flow

import * as React from 'react';

import { assetMetaData } from './asset-meta-data';
import HeroContent from './hero-content.react';
import InfoCard from './info-card.react';
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
      <InfoCard {...federated} />
      <InfoCard {...customizable} />
      <InfoCard {...encrypted} />
      <InfoCard {...sovereign} />
      <InfoCard {...openSource} />
      <InfoCard {...lessNoisy} />
    </>
  );
}

export default AppLanding;
