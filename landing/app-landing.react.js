// @flow

import * as React from 'react';

import { assetUrl, assetMetaData } from './asset-meta-data';
import CyclingHeader from './cycling-header.react';
import InfoCard from './info-card.react';
import css from './landing.css';
import StarBackground from './star-background.react';

function AppLanding(): React.Node {
  const [
    hero,
    federated,
    customizable,
    encrypted,
    sovereign,
    openSource,
    lessNoisy,
  ] = assetMetaData;

  React.useEffect(() => {
    const testWEBP = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
    const testImg = new Image();

    // preload webp if supported
    testImg.onload = () => {
      for (const imageFileName of assetMetaData) {
        const image = new Image();
        image.src = `${assetUrl}/${imageFileName.url}.webp`;
      }
    };

    // preload png if webp not supported
    testImg.onerror = () => {
      for (const imageFileName of assetMetaData) {
        const image = new Image();
        image.src = `${assetUrl}/${imageFileName.url}.png`;
      }
    };

    testImg.src = `data:image/webp;base64,${testWEBP}`;
  }, []);

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
