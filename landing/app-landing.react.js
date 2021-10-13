// @flow

import {
  faLock,
  faUserShield,
  faUsers,
  faCodeBranch,
  faTools,
  faBellSlash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import CyclingHeader from './cycling-header.react';
import InfoCard from './info-card.react';
import css from './landing.css';
import StarBackground from './star-background.react';

function AppLanding(): React.Node {
  const [activeCardIdx, setActiveCardIdx] = React.useState(-1);

  return (
    <>
      <StarBackground />
      <div className={css.app_landing_grid}>
        <div className={css.app_preview}>
          <img src="images/comm-screenshot.png" />
        </div>
        <div className={css.app_copy}>
          <CyclingHeader />
          <p className={css.app_landing_subheading}>
            (think &quot;Web3 Discord&quot;)
          </p>
          <div className={css.tile_grid}>
            <InfoCard
              idx={0}
              label="Federated"
              icon={
                <FontAwesomeIcon size="2x" color="#ffffff" icon={faUsers} />
              }
              description="Comm is a protocol paired with an app. Each community hosts its
                own backend, which we call a keyserver. Our keyserver software
                is built to be forked."
              baseStyle={css.tile_one}
              activeCardIdx={activeCardIdx}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={1}
              label="Customizable"
              icon={
                <FontAwesomeIcon size="2x" color="#ffffff" icon={faTools} />
              }
              description="Write mini-apps and custom modules in React. Skin your
                community. Customize your tabs and your home page."
              baseStyle={css.tile_two}
              activeCardIdx={activeCardIdx}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={2}
              label="E2E-encrypted"
              icon={<FontAwesomeIcon size="2x" color="#ffffff" icon={faLock} />}
              description="Comm started as a project to build a private, decentralized
                alternative to Discord. Privacy is in our DNA."
              baseStyle={css.tile_three}
              activeCardIdx={activeCardIdx}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={3}
              label="Sovereign"
              icon={
                <FontAwesomeIcon
                  size="2x"
                  color="#ffffff"
                  icon={faUserShield}
                />
              }
              description="Log in with your ETH wallet. Use ENS as your username. On Comm,
                your identity and data are yours to control."
              baseStyle={css.tile_four}
              activeCardIdx={activeCardIdx}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={4}
              label="Open Source"
              icon={
                <FontAwesomeIcon
                  size="2x"
                  color="#ffffff"
                  icon={faCodeBranch}
                />
              }
              description="All of our code is open source. Keyservers, iOS/Android app, our
                cloud services… all of it. We believe in open platforms."
              baseStyle={css.tile_five}
              activeCardIdx={activeCardIdx}
              setActiveCardIdx={setActiveCardIdx}
            />

            <InfoCard
              idx={5}
              label="Less Noisy"
              icon={
                <FontAwesomeIcon size="2x" color="#ffffff" icon={faBellSlash} />
              }
              description="We let each user decide what they want to follow with detailed
                notif controls and a powerful unified inbox."
              baseStyle={css.tile_six}
              activeCardIdx={activeCardIdx}
              setActiveCardIdx={setActiveCardIdx}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default AppLanding;
