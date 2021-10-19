// @flow

import * as React from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';

import AppLanding from './app-landing.react';
import Footer from './footer.react';
import Header from './header.react';
import Keyservers from './keyservers.react';
import Privacy from './privacy.react';
import Support from './support.react';
import Terms from './terms.react';

export type LandingPageName =
  | 'app'
  | 'keyservers'
  | 'privacy'
  | 'terms'
  | 'support';

type ActivePage = { name: LandingPageName, node: React.Node };

function Landing(): React.Node {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window?.scrollTo(0, 0);
  }, [pathname]);

  const onPrivacy = useRouteMatch({ path: '/privacy' });
  const onTerms = useRouteMatch({ path: '/terms' });
  const onSupport = useRouteMatch({ path: '/support' });
  const onKeyservers = useRouteMatch({ path: '/keyservers' });
  const isLegalPage: boolean = React.useMemo(
    () => !!(onPrivacy || onTerms || onSupport),
    [onPrivacy, onSupport, onTerms],
  );

  const activePage: ActivePage = React.useMemo(() => {
    if (onPrivacy) {
      return { name: 'privacy', node: <Privacy /> };
    } else if (onTerms) {
      return { name: 'terms', node: <Terms /> };
    } else if (onSupport) {
      return { name: 'support', node: <Support /> };
    } else if (onKeyservers) {
      return { name: 'keyservers', node: <Keyservers /> };
    } else {
      return { name: 'app', node: <AppLanding /> };
    }
  }, [onKeyservers, onPrivacy, onSupport, onTerms]);

  return (
    <div>
      <Header isLegalPage={isLegalPage} activePageName={activePage.name} />
      {activePage.node}
      <Footer isLegalPage={isLegalPage} activePageName={activePage.name} />
    </div>
  );
}

export default Landing;
