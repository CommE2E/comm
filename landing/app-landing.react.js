// @flow

import * as React from 'react';

import { assetMetaData } from './asset-meta-data.js';
import HeroContent from './hero-content.react.js';
import css from './landing.css';
import Picture from './Picture.react.js';
import usePreloadAssets from './use-pre-load-assets.react.js';

function AppLanding(): React.Node {
  usePreloadAssets(assetMetaData);
  const [hero] = assetMetaData;

  return (
    <main className={css.wrapper}>
      <div className={hero.imageStyle}>
        <Picture url={hero.url} alt={hero.alt} />
      </div>
      <HeroContent />
    </main>
  );
}

export default AppLanding;
