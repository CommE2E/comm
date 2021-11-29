// @flow

import * as React from 'react';

// import CyclingHeader from './cycling-header.react';
import { assetMeta } from './asset-meta';
import InfoCard from './info-card.react';
import './reset.css';
import css from './landing.css';
import Picture from './picture.react';
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
        <div className={`${css.oneThird} ${css.federatedImage}`}>
          <Picture path={federated.path} alt={federated.alt} />
        </div>
        <div className={`${css.twoThird} ${css.federatedInfo}`}>
          <InfoCard
            label={federated.label}
            description={federated.description}
          />
        </div>
        <div className={`${css.twoThirdInverted} ${css.customizableImage}`}>
          <Picture path={customizable.path} alt={customizable.alt} />
        </div>
        <div className={`${css.oneThirdInverted} ${css.customizableInfo}`}>
          <InfoCard
            label={customizable.label}
            description={customizable.description}
          />
        </div>
        <div className={`${css.oneThird} ${css.encryptedImage}`}>
          <Picture path={encrypted.path} alt={encrypted.alt} />
        </div>
        <div className={`${css.twoThird} ${css.encryptedInfo}`}>
          <InfoCard
            label={encrypted.label}
            description={encrypted.description}
          />
        </div>
        <div className={`${css.twoThirdInverted} ${css.sovereignImage}`}>
          <Picture path={sovereign.path} alt={sovereign.alt} />
        </div>
        <div className={`${css.oneThirdInverted} ${css.sovereignInfo}`}>
          <InfoCard
            label={sovereign.label}
            description={sovereign.description}
          />
        </div>
        <div className={`${css.oneThird} ${css.openSourceImage}`}>
          <Picture path={openSource.path} alt={openSource.alt} />
        </div>
        <div className={`${css.twoThird} ${css.openSourceInfo}`}>
          <InfoCard
            label={openSource.label}
            description={openSource.description}
          />
        </div>
        <div className={`${css.twoThirdInverted} ${css.lessNoisyImage}`}>
          <Picture path={lessNoisy.path} alt={lessNoisy.alt} />
        </div>
        <div className={`${css.oneThirdInverted} ${css.lessNoisyInfo}`}>
          <InfoCard
            label={lessNoisy.label}
            description={lessNoisy.description}
          />
        </div>
      </div>
    </>
  );
}

export default AppLanding;
