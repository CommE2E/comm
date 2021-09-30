// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Link } from 'react-router-dom';

import css from './landing.css';

export type HeaderProps = {
  +isLegalPage: boolean,
};
function Header(props: HeaderProps): React.Node {
  const { isLegalPage } = props;

  const headerStyle = isLegalPage
    ? `${css.header_grid} ${css.header_legal}`
    : css.header_grid;
  return (
    <>
      <div className={headerStyle}>
        <div className={css.logo}>
          <Link to="/">
            <h1>Comm</h1>
          </Link>
        </div>
        <div className={css.top_nav}>
          <Link to="/">
            <h1>App</h1>
          </Link>
          <Link to="/keyservers">
            <h1>Keyservers</h1>
          </Link>
        </div>
        <div className={css.social_icons}>
          <a href="https://twitter.com/commdotapp">
            <div className={css.twitter_icon}>
              <FontAwesomeIcon size="lg" color="#1d9bf0" icon={faTwitter} />
            </div>
          </a>
          <a href="https://github.com/CommE2E/comm">
            <div className={css.github_icon}>
              <FontAwesomeIcon size="lg" color="#151013" icon={faGithub} />
            </div>
          </a>
        </div>
      </div>
    </>
  );
}

export default Header;
