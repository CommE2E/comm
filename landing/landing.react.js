// @flow

import * as React from 'react';
import { useRouteMatch } from 'react-router-dom';

import {
  ModalProvider,
  useModalContext,
} from 'lib/components/modal-provider.react.js';

import AppLanding from './app-landing.react.js';
import Footer from './footer.react.js';
import Header from './header.react.js';
import Investors from './investors.react.js';
import Keyservers from './keyservers.react.js';
import css from './landing.css';
import Privacy from './privacy.react.js';
import QR from './qr.react.js';
import SIWE from './siwe.react.js';
import Support from './support.react.js';
import Team from './team.react.js';
import Terms from './terms.react.js';
import useScrollToTopOnNavigate from './use-scroll-to-top-on-navigate.react.js';
import './reset.css';
import './global.css';

function Landing(): React.Node {
  const onSIWE = useRouteMatch({ path: '/siwe' });
  if (onSIWE) {
    return <SIWE />;
  }
  return (
    <ModalProvider>
      <LandingSite />
    </ModalProvider>
  );
}

function LandingSite(): React.Node {
  const modalContext = useModalContext();

  const modals = React.useMemo(
    () =>
      modalContext.modals.map(([modal, key]) => (
        <React.Fragment key={key}>{modal}</React.Fragment>
      )),
    [modalContext.modals],
  );

  useScrollToTopOnNavigate();
  const onPrivacy = useRouteMatch({ path: '/privacy' });
  const onTerms = useRouteMatch({ path: '/terms' });
  const onSupport = useRouteMatch({ path: '/support' });
  const onKeyservers = useRouteMatch({ path: '/keyservers' });
  const onQR = useRouteMatch({ path: '/qr' });
  const onTeam = useRouteMatch({ path: '/team' });
  const onInvestors = useRouteMatch({ path: '/investors' });

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
    } else if (onInvestors) {
      return <Investors />;
    } else {
      return <AppLanding />;
    }
  }, [onKeyservers, onPrivacy, onSupport, onTerms, onTeam, onInvestors, onQR]);

  let header = <Header />;
  if (onQR) {
    header = null;
  }

  let footer = <Footer />;
  if (onQR) {
    footer = null;
  }

  return (
    <div className={css.container}>
      <div className={css.innerContainer}>
        {header}
        {activePage}
        {footer}
        {modals}
      </div>
    </div>
  );
}

export default Landing;
