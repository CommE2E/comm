// @flow

import * as React from 'react';
import { Link, useLocation, useRouteMatch } from 'react-router-dom';

import Keyservers from './keyservers.react';
import css from './landing.css';
import Privacy from './privacy.react';
import SubscriptionForm from './subscription-form.react';
import Support from './support.react';
import Terms from './terms.react';

function Landing(): React.Node {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window?.scrollTo(0, 0);
  }, [pathname]);

  const onPrivacy = useRouteMatch({ path: '/privacy' });
  const onTerms = useRouteMatch({ path: '/terms' });
  const onSupport = useRouteMatch({ path: '/support' });
  const headerStyle = React.useMemo(
    () =>
      onPrivacy || onTerms || onSupport
        ? `${css.header_grid} ${css.header_legal}`
        : css.header_grid,
    [onPrivacy, onSupport, onTerms],
  );

  const activeNode = React.useMemo(() => {
    if (onPrivacy) {
      return <Privacy />;
    } else if (onTerms) {
      return <Terms />;
    } else if (onSupport) {
      return <Support />;
    }
    return <Keyservers />;
  }, [onPrivacy, onSupport, onTerms]);

  return (
    <>
      <div className={headerStyle}>
        <Link to="/">
          <h1 className={css.logo}>Comm</h1>
        </Link>
      </div>

      {activeNode}

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
    </>
  );
}

export default Landing;
