// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { faExternalLinkAlt, faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import css from './header.css';

const iconProps = {
  size: 'sm',
  color: '#ebedee',
};

const navLinkProps = {
  className: css.tab,
  activeStyle: {
    color: 'white',
  },
};

function Header(): React.Node {
  return (
    <nav className={css.headerContainer}>
      <div className={css.headerNavContentContainer}>
        <NavLink to="/" className={css.logo}>
          <h1>Comm</h1>
        </NavLink>
        <div className={css.pageNav}>
          <NavLink to="/" exact {...navLinkProps}>
            App
          </NavLink>
          <NavLink to="/keyservers" exact {...navLinkProps}>
            Keyserver
          </NavLink>
        </div>
        <div className={css.socialIconsContainer}>
          <a href="https://web.comm.app">
            <div className={css.webappIcon}>
              <FontAwesomeIcon icon={faExternalLinkAlt} {...iconProps} />
            </div>
          </a>
          <a href="https://twitter.com/commdotapp">
            <div className={css.twitterIcon}>
              <FontAwesomeIcon icon={faTwitter} {...iconProps} />
            </div>
          </a>
          <a href="https://github.com/CommE2E/comm">
            <div className={css.githubIcon}>
              <FontAwesomeIcon icon={faGithub} {...iconProps} />
            </div>
          </a>
          <div className={css.menuIcon}>
            <FontAwesomeIcon icon={faBars} {...iconProps} />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Header;
