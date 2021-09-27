// @flow

import * as React from 'react';
import { Link, useLocation, useRouteMatch } from 'react-router-dom';

import AppLanding from './app-landing.react';
import Footer from './footer.react';
import Keyservers from './keyservers.react';
import css from './landing.css';
import Privacy from './privacy.react';
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
  const onKeyservers = useRouteMatch({ path: '/keyservers' });
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
    } else if (onKeyservers) {
      return <Keyservers />;
    }
    return <AppLanding />;
  }, [onKeyservers, onPrivacy, onSupport, onTerms]);

  return (
    <>
      <div className={headerStyle}>
        <Link to="/">
          <h1 className={css.logo}>Comm</h1>
        </Link>
      </div>

      {activeNode}

      <Footer />
    </>
  );
}

export default Landing;
