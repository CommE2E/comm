// @flow

import { faExternalLinkSquareAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import css from './footer.css';
import SubscriptionForm from './subscription-form.react.js';

const navLinkProps = {
  activeStyle: {
    color: 'white',
    fontWeight: '500',
  },
};

function Footer(): React.Node {
  return (
    <footer className={css.wrapper}>
      <div className={css.contentWrapper}>
        <div className={css.navigation}>
          <NavLink className={css.logo} to="/">
            Comm
          </NavLink>
          <NavLink to="/keyservers" exact {...navLinkProps}>
            Keyservers
          </NavLink>
          <NavLink to="/support" exact {...navLinkProps}>
            Support
          </NavLink>
          <NavLink to="/team" exact {...navLinkProps}>
            Team
          </NavLink>
          <NavLink to="/investors" exact {...navLinkProps}>
            Investors
          </NavLink>
          <NavLink to="/terms" exact {...navLinkProps}>
            Terms of Use
          </NavLink>
          <NavLink to="/privacy" exact {...navLinkProps}>
            Privacy Policy
          </NavLink>
          <a href="https://www.notion.so/How-Comm-works-d6217941db7c4237b9d08b427aef3234">
            Learn how Comm works
            <FontAwesomeIcon
              size="sm"
              color="#ffffff"
              icon={faExternalLinkSquareAlt}
            />
          </a>
          <a href="https://commapp.notion.site/Learn-more-about-Comm-1efb9b646d504dddae30a20b4f33200e">
            About Comm
            <FontAwesomeIcon
              size="sm"
              color="#ffffff"
              icon={faExternalLinkSquareAlt}
            />
          </a>
        </div>
        <div className={css.submissionForm}>
          <SubscriptionForm />
        </div>
      </div>
    </footer>
  );
}

export default Footer;
