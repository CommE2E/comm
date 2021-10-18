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
import InfoCard from './info-card.react';
import css from './landing.css';
import StarBackground from './star-background.react';

const screenshots = [
  'federated-prototype',
  'customizable-prototype',
  'e2e-encrypted-prototype',
  'sovereign-prototype',
  'open-source-prototype',
  'less-noisy-prototype',
];

function AppLanding(): React.Node {
  const [activeCardIdx, setActiveCardIdx] = React.useState(-1);

  React.useEffect(() => {
    const testWEBP = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
    const testImg = new Image();

    // preload webp if supported
    testImg.onload = () => {
      for (const imageFileName of screenshots) {
        const image = new Image();
        image.src = `images/${imageFileName}.webp`;
      }
    };

    // preload png if webp not supported
    testImg.onerror = () => {
      for (const imageFileName of screenshots) {
        const image = new Image();
        image.src = `images/${imageFileName}.png`;
      }
    };

    testImg.src = `data:image/webp;base64,${testWEBP}`;
  }, []);

  const imageIdx =
    activeCardIdx === -1
      ? 1
      : Math.min(Math.max(0, activeCardIdx), screenshots.length - 1);

  return (
    <>
      <StarBackground />
      <div className={css.app_landing_grid}>
        <div className={css.app_preview}>
          <picture>
            <source
              srcSet={`images/${screenshots[imageIdx]}.webp`}
              type="image/webp"
            />
            <source
              srcSet={`images/${screenshots[imageIdx]}.png`}
              type="image/png"
            />
            <img src={`images/${screenshots[imageIdx]}.png`} />
          </picture>
        </div>
        <div className={css.app_copy}>
          <CyclingHeader />
          <p className={css.app_landing_subheading}>
            (think &quot;Web3 Discord&quot;)
          </p>
          <div className={css.tile_grid}>
            <InfoCard
              idx={0}
              active={activeCardIdx === 0}
              label="Federated"
              icon={faUsers}
              description="Comm is a protocol paired with an app. Each community hosts its
                own backend, which we call a keyserver. Our keyserver software
                is built to be forked."
              baseStyle={css.tile_one}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={1}
              active={activeCardIdx === 1}
              label="Customizable"
              icon={faTools}
              description="Write mini-apps and custom modules in React. Skin your
                community. Customize your tabs and your home page."
              baseStyle={css.tile_two}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={2}
              active={activeCardIdx === 2}
              label="E2E-encrypted"
              icon={faLock}
              description="Comm started as a project to build a private, decentralized
                alternative to Discord. Privacy is in our DNA."
              baseStyle={css.tile_three}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={3}
              active={activeCardIdx === 3}
              label="Sovereign"
              icon={faUserShield}
              description="Log in with your ETH wallet. Use ENS as your username. On Comm,
                your identity and data are yours to control."
              baseStyle={css.tile_four}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={4}
              active={activeCardIdx === 4}
              label="Open Source"
              icon={faCodeBranch}
              description="All of our code is open source. Keyservers, iOS/Android app, our
                cloud services… all of it. We believe in open platforms."
              baseStyle={css.tile_five}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={5}
              active={activeCardIdx === 5}
              label="Less Noisy"
              icon={faBellSlash}
              description="We let each user decide what they want to follow with detailed
                notif controls and a powerful unified inbox."
              baseStyle={css.tile_six}
              setActiveCardIdx={setActiveCardIdx}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default AppLanding;
