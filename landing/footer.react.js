// @flow

import * as React from 'react';
import { Link } from 'react-router-dom';

import css from './landing.css';
import type { LandingPageName } from './landing.react';
import SubscriptionForm from './subscription-form.react';

type FooterProps = {
  +activePageName: LandingPageName,
};
function Footer(props: FooterProps): React.Node {
  const { activePageName } = props;
  return (
    <div className={css.footer_blur}>
      <div className={css.footer_grid}>
        <div className={css.sitemap}>
          <div className={css.footer_logo}>
            <Link to="/">Comm</Link>
          </div>

          <div
            className={
              activePageName === 'keyservers'
                ? css.active_tab
                : css.inactive_tab
            }
          >
            <Link to="/keyservers">Keyservers</Link>
          </div>

          <div
            className={
              activePageName === 'support' ? css.active_tab : css.inactive_tab
            }
          >
            <Link to="/support">Support</Link>
          </div>

          <div
            className={
              activePageName === 'terms' ? css.active_tab : css.inactive_tab
            }
          >
            <Link to="/terms">Terms of Use</Link>
          </div>

          <div
            className={
              activePageName === 'privacy' ? css.active_tab : css.inactive_tab
            }
          >
            <Link to="/privacy">Privacy Policy</Link>
          </div>

          <div className={css.inactive_tab}>
            <a href="https://www.notion.so/How-Comm-works-d6217941db7c4237b9d08b427aef3234">
              How Comm works
            </a>
          </div>
        </div>
        <div className={css.subscribe_updates}>
          <SubscriptionForm />
        </div>
      </div>
    </div>
  );
}

export default Footer;
