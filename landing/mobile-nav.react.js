// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import css from './mobile-nav.css';
import typography from './typography.css';

function MobileNav(): React.Node {
  const navLinkClassName = classNames([typography.paragraph2, css.tab]);

  return (
    <nav className={css.mobileNav}>
      <div className={css.tabContainer}>
        <NavLink
          to="/keyservers"
          exact
          className={navLinkClassName}
          activeClassName={css.activeTab}
        >
          <div className={css.tabContent}>Keyserver</div>
        </NavLink>
      </div>
      <div className={css.tabContainer}>
        <NavLink
          to="/team"
          exact
          className={navLinkClassName}
          activeClassName={css.activeTab}
        >
          <div className={css.tabContent}>Team</div>
        </NavLink>
      </div>
      <div className={css.tabContainer}>
        <NavLink
          to="/investors"
          exact
          className={navLinkClassName}
          activeClassName={css.activeTab}
        >
          <div className={css.tabContent}>Investors</div>
        </NavLink>
      </div>
      <div className={css.socialIconsContainer}>
        <a href="https://twitter.com/commdotapp">
          <FontAwesomeIcon icon={faTwitter} className={css.icon} size="xl" />
        </a>
        <a href="https://github.com/CommE2E/comm">
          <FontAwesomeIcon icon={faGithub} className={css.icon} size="xl" />
        </a>
      </div>
    </nav>
  );
}

export default MobileNav;
