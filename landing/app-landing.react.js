// @flow

import * as React from 'react';

import { assetMetaData } from './asset-meta-data';
import CyclingHeader from './cycling-header.react';
import InfoCard from './info-card.react';
import css from './landing.css';
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
      <div className={css.app_landing_grid}>
        <div className={css.app_preview}>
          <picture>
            <source srcSet={`${hero.url}.webp`} type="image/webp" />
            <source srcSet={`${hero.url}.png`} type="image/png" />
            <img src={`${hero.url}.png`} alt={hero.alt} />
          </picture>
        </div>
        <div className={css.app_copy}>
          <div className={css.app_copy_wrapper}>
            <CyclingHeader />
            <p className={css.app_landing_subheading}>
              (think &quot;Web3 Discord&quot;)
            </p>
          </div>

          <div className={css.tile_grid}>
            <InfoCard
              title={federated.title}
              description={federated.description}
              baseStyle={css.tile_one}
            />

            <InfoCard
              title={customizable.title}
              description={customizable.description}
              baseStyle={css.tile_two}
            />

            <InfoCard
              title={encrypted.title}
              description={encrypted.description}
              baseStyle={css.tile_three}
            />

            <InfoCard
              title={sovereign.title}
              description={sovereign.description}
              baseStyle={css.tile_four}
            />

            <InfoCard
              title={openSource.title}
              description={openSource.description}
              baseStyle={css.tile_five}
            />

            <InfoCard
              title={lessNoisy.title}
              description={lessNoisy.description}
              baseStyle={css.tile_six}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default AppLanding;
