// @flow

import {
  faTwitter,
  faGithub,
  faAppStoreIos,
} from '@fortawesome/free-brands-svg-icons';
import { faBook, faHome, faBriefcase } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import stores from 'lib/facts/stores.js';

import css from './qr.css';

function QR(): React.Node {
  const iconStyle = React.useMemo(() => ({ marginRight: '20px' }), []);

  return (
    <div className={css.body}>
      <h1>Comm</h1>

      <a href="https://twitter.com/commdotapp">
        <div className={`${css.qr_link} ${css.qr_link_twitter}`}>
          <FontAwesomeIcon icon={faTwitter} size="lg" style={iconStyle} />
          <h3>@CommDotApp</h3>
        </div>
      </a>

      <a href="https://github.com/CommE2E/comm">
        <div className={`${css.qr_link} ${css.qr_link_github}`}>
          <FontAwesomeIcon icon={faGithub} size="lg" style={iconStyle} />
          <h3>CommE2E/comm</h3>
        </div>
      </a>

      <a href={stores.appStoreUrl}>
        <div className={`${css.qr_link} ${css.qr_link_appstore}`}>
          <FontAwesomeIcon icon={faAppStoreIos} size="lg" style={iconStyle} />
          <h3>App Store (pre-alpha)</h3>
        </div>
      </a>

      <a href="https://comm.app">
        <div className={`${css.qr_link} ${css.qr_link_comm}`}>
          <FontAwesomeIcon icon={faHome} size="lg" style={iconStyle} />
          <h3>Homepage</h3>
        </div>
      </a>

      <a href="https://www.notion.so/Comm-4ec7bbc1398442ce9add1d7953a6c584">
        <div className={`${css.qr_link} ${css.qr_link_comm}`}>
          <FontAwesomeIcon icon={faBook} size="lg" style={iconStyle} />
          <h3>Technical docs</h3>
        </div>
      </a>

      <a href="https://commapp.notion.site/commapp/Comm-is-hiring-db097b0d63eb4695b32f8988c8e640fd">
        <div className={`${css.qr_link} ${css.qr_link_comm}`}>
          <FontAwesomeIcon icon={faBriefcase} size="lg" style={iconStyle} />
          <h3>We&apos;re hiring!</h3>
        </div>
      </a>
    </div>
  );
}

export default QR;
