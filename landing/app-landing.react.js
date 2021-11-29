// @flow

import * as React from 'react';

import { assetMeta } from './asset-meta';
import CyclingHeader from './cycling-header.react';
import InfoBlock from './info-card.react';
import css from './landing.css';
import Picture from './Picture.react';
import './reset.css';
import StarBackground from './star-background.react';
import usePreLoadAssets, {
  LandingAssetsS3URL,
} from './use-pre-load-assets.react';

function AppLanding(): React.Node {
  usePreLoadAssets(assetMeta);
  const [
    hero,
    federated,
    customizable,
    encrypted,
    sovereign,
    openSource,
    lessNoisy,
  ] = assetMeta.map(asset => ({
    path: `${LandingAssetsS3URL}/${asset.file}`,
    alt: asset.alt,
    label: asset.label,
    description: asset.description,
  }));

  return (
    <>
      <StarBackground />
      <div className={css.wrapper}>
        <div className={css.heroImage}>
          <Picture path={hero.path} alt={hero.alt} />
        </div>

        <div className={css.heroInfo}>
          <CyclingHeader />
          <p className={css.app_landing_subheading}>
            (think &quot;Web3 Discord&quot;)
          </p>
        </div>
        <InfoBlock
          path={federated.path}
          alt={federated.alt}
          label={federated.label}
          description={federated.description}
          imageClassName={`${css.oneThird} ${css.federatedImage}`}
          infoClassName={`${css.twoThird} ${css.federatedInfo}`}
        />
        <InfoBlock
          path={customizable.path}
          alt={customizable.alt}
          label={customizable.label}
          description={customizable.description}
          imageClassName={`${css.twoThirdInverted} ${css.customizableImage}`}
          infoClassName={`${css.oneThirdInverted} ${css.customizableInfo}`}
        />
        <InfoBlock
          path={encrypted.path}
          alt={encrypted.alt}
          label={encrypted.label}
          description={encrypted.description}
          imageClassName={`${css.oneThird} ${css.encryptedImage}`}
          infoClassName={`${css.twoThird} ${css.encryptedInfo}`}
        />
        <InfoBlock
          path={sovereign.path}
          alt={sovereign.alt}
          label={sovereign.label}
          description={sovereign.description}
          imageClassName={`${css.oneThirdInverted} ${css.sovereignImage}`}
          infoClassName={`${css.twoThirdInverted} ${css.sovereignInfo}`}
        />
        <InfoBlock
          path={openSource.path}
          alt={openSource.alt}
          label={openSource.label}
          description={openSource.description}
          imageClassName={`${css.oneThird} ${css.openSourceImage}`}
          infoClassName={`${css.twoThird} ${css.openSourceInfo}`}
        />
        <InfoBlock
          path={lessNoisy.path}
          alt={lessNoisy.alt}
          label={lessNoisy.label}
          description={lessNoisy.description}
          imageClassName={`${css.oneThirdInverted} ${css.lessNoisyImage}`}
          infoClassName={`${css.twoThirdInverted} ${css.lessNoisyInfo}`}
        />
      </div>
    </>
  );
}

export default AppLanding;
