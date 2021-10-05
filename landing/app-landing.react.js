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
        <h1>
          Comm is crypto-native chat for{' '}
          <TextLoop
            interval={1000}
            springConfig={{ stiffness: 180, damping: 16 }}
          >
            <span className={css.app_landing_subheading}>DAOs</span>
            <span className={css.app_landing_subheading}>open source</span>
            <span className={css.app_landing_subheading}>gaming guilds</span>
            <span className={css.app_landing_subheading}>social clubs</span>
          </TextLoop>
        </h1>
        <p className={css.app_landing_subheading}>
          (think &quot;Web3 Discord&quot;)
        </p>
        <div className={css.tile_grid}>
          <div className={css.tile_tl}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faLock} />
            <p className={css.tile_title}>E2E Encryption</p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
              porta, nisl eu pharetra malesuada, libero purus placerat mauris,
              sed ultricies neque enim sit amet metus. Morbi ac augue eget nunc
              vehicula interdum auctor ut ligula. Nulla sed risus in lorem
              posuere euismod. Ut et luctus leo.
            </p>
          </div>
          <div className={css.tile_tr}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faServer} />
            <p className={css.tile_title}>Self-hosted</p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
              porta, nisl eu pharetra malesuada, libero purus placerat mauris,
              sed ultricies neque enim sit amet metus. Morbi ac augue eget nunc
              vehicula interdum auctor ut ligula. Nulla sed risus in lorem
              posuere euismod. Ut et luctus leo.
            </p>
          </div>
          <div className={css.tile_bl}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faUsers} />
            <p className={css.tile_title}>Federated</p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
              porta, nisl eu pharetra malesuada, libero purus placerat mauris,
              sed ultricies neque enim sit amet metus. Morbi ac augue eget nunc
              vehicula interdum auctor ut ligula. Nulla sed risus in lorem
              posuere euismod. Ut et luctus leo.
            </p>
          </div>
          <div className={css.tile_br}>
            <FontAwesomeIcon size="2x" color="#485563" icon={faUserShield} />
            <p className={css.tile_title}>Sovereign Identity</p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
              porta, nisl eu pharetra malesuada, libero purus placerat mauris,
              sed ultricies neque enim sit amet metus. Morbi ac augue eget nunc
              vehicula interdum auctor ut ligula. Nulla sed risus in lorem
              posuere euismod. Ut et luctus leo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppLanding;
