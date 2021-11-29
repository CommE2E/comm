// @flow

import * as React from 'react';

// import CyclingHeader from './cycling-header.react';
import { screenshots } from './image-assets';
import InfoCard from './info-card.react';
import './reset.css';
import css from './landing.css';
import Picture from './picture.react';
import StarBackground from './star-background.react';
import usePreLoadAssets, {
  LandingAssetsS3URL,
} from './use-pre-load-assets.react';

function AppLanding(): React.Node {
  usePreLoadAssets(screenshots);
  const [
    federated,
    customizable,
    encrypted,
    sovereign,
    openSource,
    lessNoisy,
  ] = screenshots.map(asset => ({
    path: `${LandingAssetsS3URL}/${asset.file}`,
    alt: asset.alt,
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
        <div className={`${css.imageOne} ${css.oneThird}`}>
          <Picture path={federated.path} alt={federated.alt} />
        </div>
        <div className={`${css.infoOne} ${css.twoThird}`}>
          <InfoCard
            label="Federated"
            description="Comm is a protocol paired with an app. Each community hosts its
                own backend, which we call a keyserver. Our keyserver software
                is built to be forked."
          />
        </div>
        <div className={`${css.imageTwo} ${css.twoThirdInverted}`}>
          <Picture path={customizable.path} alt={customizable.alt} />
        </div>
        <div className={`${css.infoTwo} ${css.oneThirdInverted}`}>
          <InfoCard
            label="Customizable"
            description="Write mini-apps and custom modules in React. Skin your
                community. Customize your tabs and your home page."
          />
        </div>
        <div className={`${css.imageThree} ${css.oneThird}`}>
          <Picture path={encrypted.path} alt={encrypted.alt} />
        </div>
        <div className={`${css.infoThree} ${css.twoThird}`}>
          <InfoCard
            label="E2E-encrypted"
            description="Comm started as a project to build a private, decentralized
                alternative to Discord. Privacy is in our DNA."
          />
        </div>
        <div className={`${css.imageFour} ${css.twoThirdInverted}`}>
          <Picture path={sovereign.path} alt={sovereign.alt} />
        </div>
        <div className={`${css.imageFour} ${css.oneThirdInverted}`}>
          <InfoCard
            label="Sovereign"
            description="Log in with your ETH wallet. Use ENS as your username. On Comm,
                your identity and data are yours to control."
          />
        </div>
        <div className={`${css.imageFive} ${css.oneThird}`}>
          <Picture path={openSource.path} alt={openSource.alt} />
        </div>
        <div className={`${css.infoFive} ${css.twoThird}`}>
          <InfoCard
            label="Open Source"
            description="All of our code is open source. Keyservers, iOS/Android app, our
                cloud services… all of it. We believe in open platforms."
          />
        </div>

        <div className={`${css.imageSix} ${css.twoThirdInverted}`}>
          <Picture path={lessNoisy.path} alt={lessNoisy.alt} />
        </div>
        <div className={`${css.imageSix} ${css.oneThirdInverted}`}>
          <InfoCard
            label="Less Noisy"
            description="We let each user decide what they want to follow with detailed
                notif controls and a powerful unified inbox."
          />
        </div>
      </div>
    </>
  );
}

export default AppLanding;
