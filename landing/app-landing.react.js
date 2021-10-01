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
        <h1 className={css.no_bottom_margin}>
          Comm{' '}
          <TextLoop interval={750}>
            <span>Messenger</span>
            <span>Calendar</span>
            <span>Wiki</span>
            <span>Wallet</span>
            <span>Placeholder</span>
          </TextLoop>
        </h1>
        <p className={css.app_landing_subheading}>
          Web3 Messenger. E2E encrypted. Blah..
        </p>
        <div className={css.tile_grid}>
          <div className={css.tile_tl}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faLock} />
            <p>E2E Encryption</p>
          </div>
          <div className={css.tile_tr}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faServer} />
            <p>Self-hosted</p>
          </div>
          <div className={css.tile_bl}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faUsers} />
            <p>Federated</p>
          </div>
          <div className={css.tile_br}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faUserShield} />
            <p>Sovereign Identity</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppLanding;
