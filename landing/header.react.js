// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { isDev } from 'lib/utils/dev-utils.js';

import css from './header.css';

const iconProps = {
  size: 'lg',
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
      <a className={css.social_icon} href="https://web.comm.app">
        <FontAwesomeIcon icon={faExternalLinkAlt} {...iconProps} />
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
        <a className={css.social_icon} href="https://twitter.com/commdotapp">
          <FontAwesomeIcon icon={faTwitter} {...iconProps} />
        </a>
        <a className={css.social_icon} href="https://github.com/CommE2E/comm">
          <FontAwesomeIcon icon={faGithub} {...iconProps} />
        </a>
      </div>
    </nav>
  );
}

export default Header;
