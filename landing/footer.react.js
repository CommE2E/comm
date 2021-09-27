// @flow

import * as React from 'react';
import { Link } from 'react-router-dom';

import css from './landing.css';
import SubscriptionForm from './subscription-form.react';

function Footer(): React.Node {
  return (
    <div className={css.footer_blur}>
      <div className={css.footer_grid}>
        <div className={css.sitemap}>
          <div className={css.footer_logo}>
            <Link to="/">Comm</Link>
          </div>
          <Link to="/support">Support</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <a href="https://www.notion.so/How-Comm-works-d6217941db7c4237b9d08b427aef3234">
            How Comm works
          </a>
        </div>
        <div className={css.subscribe_updates}>
          <SubscriptionForm />
        </div>
      </div>
    </div>
  );
}

export default Footer;
