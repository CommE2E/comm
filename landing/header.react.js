// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { isDev } from 'lib/utils/dev-utils.js';

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
  let launchAppIcon;
  if (isDev) {
    launchAppIcon = (
      <a href="https://web.comm.app">
        <div className={css.webapp_icon}>
          <FontAwesomeIcon icon={faExternalLinkAlt} {...iconProps} />
        </div>
      </a>
    );
  }
  return (
    <nav className={css.wrapper}>
      <NavLink to="/" className={css.logo}>
        <h1>Comm</h1>
      </NavLink>
      <div className={css.page_nav}>
        <NavLink to="/" exact {...navLinkProps}>
          App
        </NavLink>
        <NavLink to="/keyservers" exact {...navLinkProps}>
          Keyserver
        </NavLink>
      </div>
      <div className={css.social_icons_container}>
        {launchAppIcon}
        <a href="https://twitter.com/commdotapp">
          <div className={css.twitter_icon}>
            <FontAwesomeIcon icon={faTwitter} {...iconProps} />
          </div>
        </a>
        <a href="https://github.com/CommE2E/comm">
          <div className={css.github_icon}>
            <FontAwesomeIcon icon={faGithub} {...iconProps} />
          </div>
        </a>
      </div>
    </nav>
  );
}

export default Header;
