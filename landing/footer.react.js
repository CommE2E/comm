// @flow

import { faExternalLinkSquareAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Link } from 'react-router-dom';

import footerStyles from './footer.css';
import SubscriptionForm from './subscription-form.react';

type FooterProps = {
  +isLegalPage: boolean,
  +pathname: string,
};

function Footer(props: FooterProps): React.Node {
  const { isLegalPage, pathname } = props;
  const footerGridStyle = isLegalPage
    ? `${footerStyles.footer_grid} ${footerStyles.footer_legal}`
    : footerStyles.footer_grid;

  const isActive = React.useCallback(
    pageName => {
      return `/${pageName}` === pathname
        ? footerStyles.active_tab
        : footerStyles.inactive_tab;
    },
    [pathname],
  );

  return (
    <div className={footerStyles.footer_blur}>
      <div className={footerGridStyle}>
        <div className={footerStyles.sitemap}>
          <div className={footerStyles.footer_logo}>
            <Link to="/">Comm</Link>
          </div>

          <div className={isActive('keyservers')}>
            <Link to="/keyservers">Keyservers</Link>
          </div>

          <div className={isActive('support')}>
            <Link to="/support">Support</Link>
          </div>

          <div className={isActive('terms')}>
            <Link to="/terms">Terms of Use</Link>
          </div>

          <div className={isActive('privacy')}>
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
