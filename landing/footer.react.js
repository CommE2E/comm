// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
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

  return (
    <footer className={css.wrapper}>
      <div className={css.contentWrapper}>
        <div className={css.navigation}>
          <div className={css.linksContainer}>
            <NavLink className={logoClassName} to="/">
              Comm
            </NavLink>
            <NavLink
              to="/keyservers"
              exact
              {...navLinkProps}
              className={navLinkClassName}
            >
              Keyservers
            </NavLink>
            <NavLink
              to="/support"
              exact
              {...navLinkProps}
              className={navLinkClassName}
            >
              Support
            </NavLink>
            <NavLink
              to="/team"
              exact
              {...navLinkProps}
              className={navLinkClassName}
            >
              Team
            </NavLink>
            <NavLink
              to="/investors"
              exact
              {...navLinkProps}
              className={navLinkClassName}
            >
              Investors
            </NavLink>
            <a
              href="https://www.notion.so/How-Comm-works-d6217941db7c4237b9d08b427aef3234"
              target="_blank"
              rel="noreferrer"
              className={navLinkClassName}
            >
              Learn how Comm works
              <FontAwesomeIcon
                size="sm"
                className={css.navLinkIcons}
                icon={faExternalLinkAlt}
              />
            </a>
            <a
              href="https://commapp.notion.site/Learn-more-about-Comm-1efb9b646d504dddae30a20b4f33200e"
              target="_blank"
              rel="noreferrer"
              className={navLinkClassName}
            >
              About Comm
              <FontAwesomeIcon
                size="sm"
                className={css.navLinkIcons}
                icon={faExternalLinkAlt}
              />
            </a>
          </div>
          <div className={css.socialIconsContainer}>
            <a
              href="https://twitter.com/commdotapp"
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon
                size="lg"
                className={css.socialIcons}
                icon={faTwitter}
              />
            </a>
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
            &copy; 2023 Comm. All Rights Reserved
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
