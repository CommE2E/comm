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
      <InfoCard title={federated.title} description={federated.description} />
      <InfoCard
        title={customizable.title}
        description={customizable.description}
      />
      <InfoCard title={encrypted.title} description={encrypted.description} />
      <InfoCard title={sovereign.title} description={sovereign.description} />
      <InfoCard title={openSource.title} description={openSource.description} />
      <InfoCard title={lessNoisy.title} description={lessNoisy.description} />
    </>
  );
}

export default AppLanding;
