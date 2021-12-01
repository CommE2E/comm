// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Link } from 'react-router-dom';

import headerStyles from './header.css';

type HeaderProps = {
  +isLegalPage: boolean,
  +pathname: string,
  +onRequestAccess: (e: Event) => Promise<void>,
};

function Header(props: HeaderProps): React.Node {
  const { isLegalPage, pathname, onRequestAccess } = props;

  const isActive = React.useCallback(
    pageName => {
      return `/${pageName}` === pathname
        ? headerStyles.active_tab
        : headerStyles.inactive_tab;
    },
    [pathname],
  );

  const headerStyle = isLegalPage
    ? `${headerStyles.header_grid} ${headerStyles.header_legal}`
    : headerStyles.header_grid;

  return (
    <>
      <div className={headerStyle}>
        <div className={headerStyles.logo}>
          <Link to="/">
            <h1>Comm</h1>
          </Link>
        </div>
        <div className={headerStyles.top_nav}>
          <div className={isActive('')}>
            <Link to="/">
              <h1>App</h1>
            </Link>
          </div>
          <div className={isActive('keyservers')}>
            <Link to="/keyservers">
              <h1>Keyserver</h1>
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
