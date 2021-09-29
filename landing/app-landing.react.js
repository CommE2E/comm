// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import {
  faLock,
  faUserShield,
  faUsers,
  faServer,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import css from './landing.css';

function AppLanding(): React.Node {
  return (
    <div className={css.app_landing_grid}>
      <div className={css.app_preview}>
        <img src="images/comm-screenshot.png" />
      </div>
      <div className={css.app_copy}>
        <h1 className={css.no_bottom_margin}>Comm Messenger</h1>
        <p className={css.app_landing_subheading}>
          Web3 Messenger. E2E encrypted. Blah..
        </p>
        <div className={css.tile_grid}>
          <div className={css.tile_tl}>
            <FontAwesomeIcon size="2x" color="#7e57c2" icon={faLock} />
            <p>E2E Encryption</p>
          </div>
          <div className={css.tile_tr}>
            <FontAwesomeIcon size="2x" color="#7e57c2" icon={faServer} />
            <p>Self-hosted</p>
          </div>
          <div className={css.tile_bl}>
            <FontAwesomeIcon size="2x" color="#7e57c2" icon={faUsers} />
            <p>Federated</p>
          </div>
          <div className={css.tile_br}>
            <FontAwesomeIcon size="2x" color="#7e57c2" icon={faUserShield} />
            <p>Sovereign Identity</p>
          </div>
          <a href="https://twitter.com/commdotapp">
            <div className={css.tile_twtr}>
              <FontAwesomeIcon size="2x" color="#1d9bf0" icon={faTwitter} />
            </div>
          </a>
          <a href="https://github.com/CommE2E/comm">
            <div className={css.tile_gh}>
              <FontAwesomeIcon size="2x" color="#151013" icon={faGithub} />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default AppLanding;
