// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Link } from 'react-router-dom';

import headerStyles from './header.css';
import commonStyles from './landing.css';
import type { LandingPageName } from './landing.react';

type HeaderProps = {
  +isLegalPage: boolean,
  +activePageName: LandingPageName,
};
function Header(props: HeaderProps): React.Node {
  const { isLegalPage, activePageName } = props;

  const headerStyle = isLegalPage
    ? `${headerStyles.header_grid} ${headerStyles.header_legal}`
    : headerStyles.header_grid;
  return (
    <>
      <div className={headerStyle}>
        <div className={commonStyles.logo}>
          <Link to="/">
            <h1>Comm</h1>
          </Link>
        </div>
        <div className={commonStyles.top_nav}>
          <div
            className={
              activePageName === 'app'
                ? commonStyles.active_tab
                : commonStyles.inactive_tab
            }
          >
            <Link to="/">
              <h1>App</h1>
            </Link>
          </div>
          <div
            className={
              activePageName === 'keyservers'
                ? commonStyles.active_tab
                : commonStyles.inactive_tab
            }
          >
            <Link to="/keyservers">
              <h1>Keyservers</h1>
            </Link>
          </div>
        </div>
        <div className={commonStyles.social_icons}>
          <a href="">
            <div className={headerStyles.request_access}>
              <p>Request Access</p>
            </div>
          </a>
          <a href="https://twitter.com/commdotapp">
            <div className={headerStyles.twitter_icon}>
              <FontAwesomeIcon size="lg" color="#ebedee" icon={faTwitter} />
            </div>
          </a>
          <a href="https://github.com/CommE2E/comm">
            <div className={headerStyles.github_icon}>
              <FontAwesomeIcon size="lg" color="#ebedee" icon={faGithub} />
            </div>
          </a>
        </div>
      </div>
    </>
  );
}

export default Header;
