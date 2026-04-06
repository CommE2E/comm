// @flow

import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import css from './footer.css';
import typography from './typography.css';

const navLinkProps = {
  activeStyle: {
    color: 'white',
    fontWeight: '500',
  },
};

function Footer(): React.Node {
  const logoClassName = classNames([typography.heading2, css.logo]);
  const navLinkClassName = classNames([typography.paragraph1, css.links]);
  const legalTextClassName = classNames([
    typography.paragraph2,
    css.copyrightText,
  ]);
  const legalLinksClassName = classNames([typography.paragraph2, css.links]);

  const currentYear = new Date().getFullYear();

  return (
    <footer className={css.wrapper}>
      <div className={css.contentWrapper}>
        <div className={css.navigation}>
          <div className={css.linksContainer}>
            <NavLink className={logoClassName} to="/">
              Comm
            </NavLink>
            <NavLink
              to="/story"
              exact
              {...navLinkProps}
              className={navLinkClassName}
            >
              Story
            </NavLink>
            <NavLink
              to="/keyservers"
              exact
              {...navLinkProps}
              className={navLinkClassName}
            >
              Keyservers
            </NavLink>
            <a
              href="https://dh9fld3hutpxf.cloudfront.net/whitepaper.pdf"
              target="_blank"
              rel="noreferrer"
              className={navLinkClassName}
              type="application/pdf"
            >
              Whitepaper
              <FontAwesomeIcon
                size="sm"
                className={css.navLinkIcons}
                icon={faExternalLinkAlt}
              />
            </a>
            <NavLink
              to="/support"
              exact
              {...navLinkProps}
              className={navLinkClassName}
            >
              Support
            </NavLink>
          </div>
          <div className={css.socialIconsContainer}>
            <a
              href="https://github.com/CommE2E/comm"
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon
                size="lg"
                className={css.socialIcons}
                icon={faGithub}
              />
            </a>
          </div>
        </div>
        <div className={css.legalContainer}>
          <p className={legalTextClassName}>
            &copy; {currentYear} Comm Technologies, Inc.
          </p>
          <div className={css.legalLinks}>
            <NavLink
              to="/terms"
              exact
              {...navLinkProps}
              className={legalLinksClassName}
            >
              Terms of Use
            </NavLink>
            <NavLink
              to="/privacy"
              exact
              {...navLinkProps}
              className={legalLinksClassName}
            >
              Privacy Policy
            </NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
