// @flow

import * as React from 'react';

// import CyclingHeader from './cycling-header.react';
import { assetMeta } from './asset-meta';
import InfoBlock from './info-card.react';
import './reset.css';
import css from './landing.css';
import StarBackground from './star-background.react';
import usePreLoadAssets, {
  LandingAssetsS3URL,
} from './use-pre-load-assets.react';

function AppLanding(): React.Node {
  usePreLoadAssets(assetMeta);
  const [
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
        {/* <div className={css.app_preview}> */}
        {/* <picture>
            <source srcSet={`${path}.webp`} type="image/webp" />
            <source srcSet={`${path}.png`} type="image/png" />
            <img src={`${path}.png`} alt={firstScreenShot.alt} />
          </picture> */}
        {/* </div> */}
        {/* <div className={css.app_copy}> */}
        {/* <div className={css.app_copy_wrapper}>
            <CyclingHeader />
            <p className={css.app_landing_subheading}>
              (think &quot;Web3 Discord&quot;)
            </p>
          </div> */}

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
