// @flow

import * as React from 'react';

import { imageAssetMetaData } from './asset-meta-data.js';
import HeroContent from './hero-content.react.js';
import css from './landing.css';
import Picture from './Picture.react.js';
import usePreloadImageAssets from './use-pre-load-image-assets.react.js';

function AppLanding(): React.Node {
  usePreloadImageAssets(imageAssetMetaData);
  const [hero] = imageAssetMetaData;

  return (
    <main>
      <section className={css.heroSection}>
        <div className={css.heroContainer}>
          <div className={css.heroImage}>
            <Picture url={hero.url} alt={hero.alt} />
          </div>
          <HeroContent />
        </div>
      </section>
    </main>
  );
}

export default AppLanding;
