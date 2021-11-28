// @flow

import {
  faLock,
  faUserShield,
  faUsers,
  faCodeBranch,
  faTools,
  faBellSlash,
} from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';

import CyclingHeader from './cycling-header.react';
import { screenshots } from './image-assets';
import InfoCard from './info-card.react';
import css from './landing.css';
import StarBackground from './star-background.react';
import usePreLoadAssets, {
  LandingAssetsS3URL,
} from './use-pre-load-assets.react';

function AppLanding(): React.Node {
  usePreLoadAssets(screenshots);
  const [firstScreenShot] = screenshots;
  const path = `${LandingAssetsS3URL}/${firstScreenShot.file}`;

  return (
    <>
      <StarBackground />
      <div className={css.app_landing_grid}>
        <div className={css.app_preview}>
          <picture>
            <source srcSet={`${path}.webp`} type="image/webp" />
            <source srcSet={`${path}.png`} type="image/png" />
            <img src={`${path}.png`} alt={firstScreenShot.alt} />
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
              label="Federated"
              icon={faUsers}
              description="Comm is a protocol paired with an app. Each community hosts its
                own backend, which we call a keyserver. Our keyserver software
                is built to be forked."
              baseStyle={css.tile_one}
            />
            <InfoCard
              label="Customizable"
              icon={faTools}
              description="Write mini-apps and custom modules in React. Skin your
                community. Customize your tabs and your home page."
              baseStyle={css.tile_two}
            />
            <InfoCard
              label="E2E-encrypted"
              icon={faLock}
              description="Comm started as a project to build a private, decentralized
                alternative to Discord. Privacy is in our DNA."
              baseStyle={css.tile_three}
            />
            <InfoCard
              label="Sovereign"
              icon={faUserShield}
              description="Log in with your ETH wallet. Use ENS as your username. On Comm,
                your identity and data are yours to control."
              baseStyle={css.tile_four}
            />
            <InfoCard
              label="Open Source"
              icon={faCodeBranch}
              description="All of our code is open source. Keyservers, iOS/Android app, our
                cloud services… all of it. We believe in open platforms."
              baseStyle={css.tile_five}
            />
            <InfoCard
              label="Less Noisy"
              icon={faBellSlash}
              description="We let each user decide what they want to follow with detailed
                notif controls and a powerful unified inbox."
              baseStyle={css.tile_six}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default AppLanding;
