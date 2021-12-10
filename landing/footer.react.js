// @flow

import { faExternalLinkSquareAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import footerStyles from './footer.css';
import SubscriptionForm from './subscription-form.react';

const navLinkProps = {
  className: footerStyles.inactive_tab,
  activeStyle: {
    color: 'white',
    fontWeight: '500',
  },
};

function Footer(): React.Node {
  const footerGridStyle = `${footerStyles.footer_grid}`;

  return (
    <div className={footerStyles.footer_blur}>
      <div className={footerGridStyle}>
        <div className={footerStyles.sitemap}>
          <div className={footerStyles.footer_logo}>
            <NavLink to="/">Comm</NavLink>
          </div>

          <div>
            <NavLink to="/keyservers" exact {...navLinkProps}>
              Keyservers
            </NavLink>
          </div>

          <div>
            <NavLink to="/support" exact {...navLinkProps}>
              Support
            </NavLink>
          </div>

          <div>
            <NavLink to="/terms" exact {...navLinkProps}>
              Terms of Use
            </NavLink>
          </div>

          <div>
            <NavLink to="/privacy" exact {...navLinkProps}>
              Privacy Policy
            </NavLink>
          </div>

          <div className={footerStyles.inactive_tab}>
            <a href="https://www.notion.so/How-Comm-works-d6217941db7c4237b9d08b427aef3234">
              How Comm works{' '}
              <FontAwesomeIcon
                size="sm"
                color="#ffffff"
                icon={faExternalLinkSquareAlt}
              />
            </a>
          </div>
        </div>
        <div className={footerStyles.subscribe_updates}>
          <SubscriptionForm />
        </div>
      </div>
    </div>
  );
}

export default Footer;
