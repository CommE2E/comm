// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import {
  faExternalLinkAlt,
  faBars,
  faTimes,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import type { SetState } from 'lib/types/hook-types.js';

import FarcasterLogo from './assets/farcaster-logo.react.js';
import css from './header.css';
import typography from './typography.css';

// This value comes from the breakpoint value in header.css. Please make sure
// that this value is in sync with header.css if ever changed
export const HEADER_BREAKPOINT = 904; // px

type Props = {
  +showMobileNav: boolean,
  +setShowMobileNav: SetState<boolean>,
};

function Header(props: Props): React.Node {
  const { showMobileNav, setShowMobileNav } = props;

  const headerContentContainerClassName = classNames({
    [css.headerNavContentContainer]: true,
    [css.headerContainerMobileNavActive]: showMobileNav,
  });

  const logoTextClassName = classNames([typography.heading2, css.logoText]);
  const badgeClassName = classNames([typography.paragraph2, css.betaBadge]);
  const navLinkClassName = classNames([typography.subheading2, css.tab]);

  const onClickLogo = React.useCallback(() => {
    setShowMobileNav(false);
  }, [setShowMobileNav]);

  const onClickMobileNavIcon = React.useCallback(() => {
    setShowMobileNav(!showMobileNav);
  }, [setShowMobileNav, showMobileNav]);

  return (
    <nav className={css.headerContainer}>
      <div className={headerContentContainerClassName}>
        <div className={css.logo}>
          <NavLink to="/">
            <h1 onClick={onClickLogo} className={logoTextClassName}>
              Comm
            </h1>
          </NavLink>
          <div className={badgeClassName}>Beta</div>
        </div>
        <div className={css.pageNav}>
          <NavLink
            to="/keyservers"
            exact
            className={navLinkClassName}
            activeClassName={css.activeTab}
          >
            Keyserver
          </NavLink>
          <NavLink
            to="/team"
            exact
            className={navLinkClassName}
            activeClassName={css.activeTab}
          >
            Team
          </NavLink>
          <NavLink
            to="/investors"
            exact
            className={navLinkClassName}
            activeClassName={css.activeTab}
          >
            Investors
          </NavLink>
        </div>
        <div className={css.socialIconsContainer}>
          <NavLink
            to="/download"
            exact
            className={navLinkClassName}
            activeClassName={css.activeTab}
          >
            <div className={css.commAppIcon}>
              <FontAwesomeIcon
                icon={faDownload}
                className={css.icon}
                size="sm"
              />
            </div>
          </NavLink>
          <a href="https://web.comm.app" target="_blank" rel="noreferrer">
            <div className={css.commAppIcon}>
              <FontAwesomeIcon
                icon={faExternalLinkAlt}
                className={css.icon}
                size="sm"
              />
            </div>
          </a>
          <a
            href="https://github.com/CommE2E/comm"
            target="_blank"
            rel="noreferrer"
          >
            <div className={css.githubIcon}>
              <FontAwesomeIcon icon={faGithub} className={css.icon} size="sm" />
            </div>
          </a>
          <div className={css.menuIcon} onClick={onClickMobileNavIcon}>
            <FontAwesomeIcon
              icon={showMobileNav ? faTimes : faBars}
              className={css.icon}
              size="sm"
            />
          </div>
          <a
            href="https://warpcast.com/comm.eth"
            target="_blank"
            rel="noreferrer"
          >
            <div className={css.farcasterIcon}>
              <FarcasterLogo size={30} className={css.icon} />
            </div>
          </a>
          <a
            href="https://twitter.com/commdotapp"
            target="_blank"
            rel="noreferrer"
          >
            <div className={css.twitterIcon}>
              <FontAwesomeIcon
                icon={faTwitter}
                className={css.icon}
                size="sm"
              />
            </div>
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Header;
