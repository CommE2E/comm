// @flow

import * as React from 'react';

import { assetMetaData } from './asset-meta-data.js';
import HeroContent from './hero-content.react.js';
import InfoBlock from './info-block.react.js';
import css from './landing.css';
import Picture from './Picture.react.js';
import StarBackground from './star-background.react.js';
import usePreloadAssets from './use-pre-load-assets.react.js';

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
    <main className={css.wrapper}>
      <StarBackground />
      <div className={hero.imageStyle}>
        <Picture url={hero.url} alt={hero.alt} />
      </div>
      <HeroContent />
      <InfoBlock {...federated} />
      <InfoBlock {...customizable} />
      <InfoBlock {...encrypted} />
      <InfoBlock {...sovereign} />
      <InfoBlock {...openSource} />
      <InfoBlock {...lessNoisy} />
    </main>
  );
}

export default AppLanding;
