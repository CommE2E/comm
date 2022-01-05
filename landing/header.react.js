// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import Button from './button.react.js';
import css from './header.css';

type HeaderProps = {
  +onRequestAccess: (e: Event) => Promise<void>,
};

const iconProps = {
  size: 'lg',
  color: '#ebedee',
};

const navLinkProps = {
  className: css.tab,
  activeStyle: {
    color: 'white',
    fontWeight: '500',
  },
};

function Header(props: HeaderProps): React.Node {
  const { onRequestAccess } = props;

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
      <div className={css.button_container}>
        <Button onClick={onRequestAccess}>Request Access</Button>
      </div>
      <div className={css.social_icons}>
        <a className={css.twitter_icon} href="https://twitter.com/commdotapp">
          <FontAwesomeIcon icon={faTwitter} {...iconProps} />
        </a>
        <a className={css.github_icon} href="https://github.com/CommE2E/comm">
          <FontAwesomeIcon icon={faGithub} {...iconProps} />
        </a>
      </div>
    </nav>
  );
}

export default Header;
