// @flow

import { faExternalLinkSquareAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Link } from 'react-router-dom';

import footerStyles from './footer.css';
import type { LandingPageName } from './landing.react';
import SubscriptionForm from './subscription-form.react';

type FooterProps = {
  +activePageName: LandingPageName,
};
function Footer(props: FooterProps): React.Node {
  const { activePageName } = props;

  const footerGridStyle = `${footerStyles.footer_grid}`;

  return (
    <div className={footerStyles.footer_blur}>
      <div className={footerGridStyle}>
        <div className={footerStyles.sitemap}>
          <div className={footerStyles.footer_logo}>
            <Link to="/">Comm</Link>
          </div>

          <div
            className={
              activePageName === 'keyservers'
                ? footerStyles.active_tab
                : footerStyles.inactive_tab
            }
          >
            <Link to="/keyservers">Keyservers</Link>
          </div>

          <div
            className={
              activePageName === 'support'
                ? footerStyles.active_tab
                : footerStyles.inactive_tab
            }
          >
            <Link to="/support">Support</Link>
          </div>

          <div
            className={
              activePageName === 'terms'
                ? footerStyles.active_tab
                : footerStyles.inactive_tab
            }
          >
            <Link to="/terms">Terms of Use</Link>
          </div>

          <div
            className={
              activePageName === 'privacy'
                ? footerStyles.active_tab
                : footerStyles.inactive_tab
            }
          >
            <Link to="/privacy">Privacy Policy</Link>
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
