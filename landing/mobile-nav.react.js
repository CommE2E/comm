// @flow

import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import type { SetState } from 'lib/types/hook-types.js';

import css from './mobile-nav.css';
import typography from './typography.css';

type Props = {
  +showMobileNav: boolean,
  +setShowMobileNav: SetState<boolean>,
};

function MobileNav(props: Props): React.Node {
  const { showMobileNav, setShowMobileNav } = props;

  const navLinkClassName = classNames([typography.paragraph2, css.tab]);

  const mobileNavClassName = classNames({
    [css.mobileNav]: true,
    [css.activeMobileNav]: showMobileNav,
  });

  const dismissMobileNav = React.useCallback(() => {
    setShowMobileNav(false);
  }, [setShowMobileNav]);

  return (
    <nav className={mobileNavClassName}>
      <div className={css.tabContainer}>
        <NavLink
          to="/story"
          exact
          className={navLinkClassName}
          activeClassName={css.activeTab}
        >
          <div onClick={dismissMobileNav} className={css.tabContent}>
            Story
          </div>
        </NavLink>
      </div>
      <div className={css.tabContainer}>
        <NavLink
          to="/keyservers"
          exact
          className={navLinkClassName}
          activeClassName={css.activeTab}
        >
          <div onClick={dismissMobileNav} className={css.tabContent}>
            Keyservers
          </div>
        </NavLink>
      </div>
      <div className={css.tabContainer}>
        <a
          href="https://dh9fld3hutpxf.cloudfront.net/whitepaper.pdf"
          target="_blank"
          rel="noreferrer"
          className={navLinkClassName}
          onClick={dismissMobileNav}
        >
          <div className={css.tabContent}>Whitepaper</div>
        </a>
      </div>
      <div className={css.socialIconsContainer}>
        <NavLink to="/download" exact className={navLinkClassName}>
          <FontAwesomeIcon
            onClick={dismissMobileNav}
            icon={faDownload}
            className={css.icon}
            size="1x"
          />
        </NavLink>
        <a
          href="https://github.com/CommE2E/comm"
          target="_blank"
          rel="noreferrer"
        >
          <FontAwesomeIcon icon={faGithub} className={css.icon} size="1x" />
        </a>
      </div>
    </nav>
  );
}

export default MobileNav;
