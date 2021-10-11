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
import TextLoop from 'react-text-loop';

import css from './landing.css';
import StarBackground from './star-background.react';

function AppLanding(): React.Node {
  return (
    <>
      <StarBackground />
      <div className={css.app_landing_grid}>
        <div className={css.app_preview}>
          <img src="images/comm-screenshot.png" />
        </div>
        <div className={css.app_copy}>
          <h1 className={css.cycling_header}>
            Comm is crypto-native chat for{' '}
            <TextLoop
              interval={1750}
              springConfig={{ stiffness: 180, damping: 16 }}
            >
              <span className={css.app_landing_subheading}>DAOs</span>
              <span className={css.app_landing_subheading}>
                art collectives
              </span>
              <span className={css.app_landing_subheading}>venture funds</span>
              <span className={css.app_landing_subheading}>open source</span>
              <span className={css.app_landing_subheading}>gaming guilds</span>
              <span className={css.app_landing_subheading}>social clubs</span>
            </TextLoop>
          </h1>
          <p className={css.app_landing_subheading}>
            (think &quot;Web3 Discord&quot;)
          </p>
          <div className={css.tile_grid}>
            <div className={css.tile_one}>
              <div className={css.tile_title_row}>
                <FontAwesomeIcon size="2x" color="#ffffff" icon={faUsers} />
                <p className={css.tile_title}>Federated</p>
              </div>
              <p>
                Comm is a protocol paired with an app. Each community hosts its
                own backend, which we call a keyserver. Our keyserver software
                is built to be forked.
              </p>
            </div>
            <div className={css.tile_two}>
              <div className={css.tile_title_row}>
                <FontAwesomeIcon size="2x" color="#ffffff" icon={faTools} />
                <p className={css.tile_title}>Customizable</p>
              </div>
              <p>
                Write mini-apps and custom modules in React. Skin your
                community. Customize your tabs and your home page.
              </p>
            </div>
            <div className={css.tile_three}>
              <div className={css.tile_title_row}>
                <FontAwesomeIcon size="2x" color="#ffffff" icon={faLock} />
                <p className={css.tile_title}>E2E-encrypted</p>
              </div>
              <p>
                Comm started as a project to build a private, decentralized
                alternative to Discord. Privacy is in our DNA.
              </p>
            </div>
            <div className={css.tile_four}>
              <div className={css.tile_title_row}>
                <FontAwesomeIcon
                  size="2x"
                  color="#ffffff"
                  icon={faUserShield}
                />
                <p className={css.tile_title}>Sovereign</p>
              </div>
              <p>
                Log in with your ETH wallet. Use ENS as your username. On Comm,
                your identity and data are yours to control.
              </p>
            </div>
            <div className={css.tile_five}>
              <div className={css.tile_title_row}>
                <FontAwesomeIcon
                  size="2x"
                  color="#ffffff"
                  icon={faCodeBranch}
                />
                <p className={css.tile_title}>Open Source</p>
              </div>
              <p>
                All of our code is open source. Keyservers, iOS/Android app, our
                cloud services… all of it. We believe in open platforms.
              </p>
            </div>
            <div className={css.tile_six}>
              <div className={css.tile_title_row}>
                <FontAwesomeIcon size="2x" color="#ffffff" icon={faBellSlash} />
                <p className={css.tile_title}>Less Noisy</p>
              </div>
              <p>
                We let each user decide what they want to follow with detailed
                notif controls and a powerful unified inbox.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AppLanding;
