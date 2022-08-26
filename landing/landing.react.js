// @flow

import * as React from 'react';
import { useRouteMatch } from 'react-router-dom';

import AppLanding from './app-landing.react';
import Footer from './footer.react';
import Header from './header.react';
import Keyservers from './keyservers.react';
import Privacy from './privacy.react';
import QR from './qr.react';
import Support from './support.react';
import Team from './team.react';
import Terms from './terms.react';
import useScrollToTopOnNavigate from './use-scroll-to-top-on-navigate.react';
import './reset.css';
import './global.css';

function Landing(): React.Node {
  useScrollToTopOnNavigate();
  const onPrivacy = useRouteMatch({ path: '/privacy' });
  const onTerms = useRouteMatch({ path: '/terms' });
  const onSupport = useRouteMatch({ path: '/support' });
  const onKeyservers = useRouteMatch({ path: '/keyservers' });
  const onQR = useRouteMatch({ path: '/qr' });
  const onTeam = useRouteMatch({ path: '/team' });
  const onSIWE = useRouteMatch({ path: '/siwe' });

  const activePage = React.useMemo(() => {
    if (onPrivacy) {
      return <Privacy />;
    } else if (onTerms) {
      return <Terms />;
    } else if (onSupport) {
      return <Support />;
    } else if (onKeyservers) {
      return <Keyservers />;
    } else if (onQR) {
      return <QR />;
    } else if (onTeam) {
      return <Team />;
    } else {
      return <AppLanding />;
    }
  }, [onKeyservers, onPrivacy, onSupport, onTerms, onTeam, onQR, onSIWE]);

  let header;
  if (!onQR) {
    header = <Header />;
  }

  let footer;
  if (!onQR) {
    footer = <Footer />;
  }

  return (
    <>
      {header}
      {activePage}
      {footer}
    </>
  );
}

export default Landing;
