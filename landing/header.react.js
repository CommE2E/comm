// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Link } from 'react-router-dom';

import headerStyles from './header.css';
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

  const onRequestAccess = React.useCallback(async (e: Event) => {
    e.preventDefault();
    window?.scrollTo(0, document.body?.scrollHeight);
    document.getElementById('subscription-form')?.focus();
  }, []);

  return (
    <>
      <div className={headerStyle}>
        <div className={headerStyles.logo}>
          <Link to="/">
            <h1>Comm</h1>
          </Link>
        </div>
        <div className={headerStyles.top_nav}>
          <div
            className={
              activePageName === 'app'
                ? headerStyles.active_tab
                : headerStyles.inactive_tab
            }
          >
            <Link to="/">
              <h1>App</h1>
            </Link>
          </div>
          <div
            className={
              activePageName === 'keyservers'
                ? headerStyles.active_tab
                : headerStyles.inactive_tab
            }
          >
            <Link to="/keyservers">
              <h1>Keyservers</h1>
            </Link>
          </div>
        </div>
        <div className={headerStyles.social_icons}>
          <a href="#" onClick={onRequestAccess}>
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
