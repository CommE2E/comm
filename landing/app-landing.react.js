// @flow

import {
  faLock,
  faUserShield,
  faUsers,
  faServer,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import TextLoop from 'react-text-loop';

import css from './landing.css';

function AppLanding(): React.Node {
  return (
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
            <span className={css.app_landing_subheading}>art collectives</span>
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
            <FontAwesomeIcon size="2x" color="#485563" icon={faLock} />
            <p className={css.tile_title}>Federated</p>
            <p>
              Comm is a protocol paired with an app. Each community hosts its
              own backend, which we call a keyserver. Our keyserver software is
              built to be forked.
            </p>
          </div>
          <div className={css.tile_two}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faServer} />
            <p className={css.tile_title}>Customizable</p>
            <p>
              Write mini-apps and custom modules in React. Skin your community.
              Customize your tabs and your home page.
            </p>
          </div>
          <div className={css.tile_three}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faUsers} />
            <p className={css.tile_title}>E2E-encrypted</p>
            <p>
              Comm started as a project to build a private, decentralized
              alternative to Discord. Privacy is in our DNA.
            </p>
          </div>
          <div className={css.tile_four}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faUserShield} />
            <p className={css.tile_title}>Sovereign</p>
            <p>
              Log in with your ETH wallet. Use ENS as your username. On Comm,
              your identity and data are yours to control.
            </p>
          </div>
          <div className={css.tile_five}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faUserShield} />
            <p className={css.tile_title}>Open Source</p>
            <p>
              All of our code is open source. Keyservers, iOS/Android app, our
              cloud services… all of it. We believe in open platforms.
            </p>
          </div>
          <div className={css.tile_six}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faUserShield} />
            <p className={css.tile_title}>Less Noisy</p>
            <p>
              We let each user decide what they want to follow with detailed
              notif controls and a powerful unified inbox.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppLanding;
