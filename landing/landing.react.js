// @flow

import classNames from 'classnames';
import * as React from 'react';
import { Redirect, useRouteMatch } from 'react-router-dom';

import {
  ModalProvider,
  useModalContext,
} from 'lib/components/modal-provider.react.js';

import AppLanding from './app-landing.react.js';
import Beta from './beta.react.js';
import ConnectFarcaster from './connect-farcaster.react.js';
import Download from './download.react.js';
import Footer from './footer.react.js';
import Header, { HEADER_BREAKPOINT } from './header.react.js';
import Keyservers from './keyservers.react.js';
import css from './landing.css';
import MobileNav from './mobile-nav.react.js';
import Privacy from './privacy.react.js';
import QR from './qr.react.js';
import SIWE from './siwe.react.js';
import Story from './story.react.js';
import Support from './support.react.js';
import Supporters from './supporters.react.js';
import Terms from './terms.react.js';
import useScrollToTopOnNavigate from './use-scroll-to-top-on-navigate.react.js';
import './reset.css';
import './global.css';

function Landing(): React.Node {
  const onSIWE = useRouteMatch({ path: '/siwe' });
  const onConnectFarcaster = useRouteMatch({ path: '/connect-farcaster' });

  if (onSIWE) {
    return <SIWE />;
  } else if (onConnectFarcaster) {
    return <ConnectFarcaster />;
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

  const isModalOpen = modals.length > 0;
  React.useEffect(() => {
    const { body } = document;
    if (!body || !isModalOpen) {
      return undefined;
    }

    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = 'auto';
    };
  }, [isModalOpen]);

  const [showMobileNav, setShowMobileNav] = React.useState<boolean>(false);

  const handleResize = React.useCallback(() => {
    if (window.innerWidth > HEADER_BREAKPOINT) {
      setShowMobileNav(false);
    }
  }, [setShowMobileNav]);

  React.useEffect(() => {
    if (!showMobileNav) {
      return undefined;
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize, showMobileNav]);

  const innerContainerClassName = classNames({
    [css.innerContainer]: true,
    [css.innerContainerMobileNav]: showMobileNav,
  });

  useScrollToTopOnNavigate();
  const onPrivacy = useRouteMatch({ path: '/privacy' });
  const onTerms = useRouteMatch({ path: '/terms' });
  const onSupport = useRouteMatch({ path: '/support' });
  const onStory = useRouteMatch({ path: '/story' });
  const onKeyservers = useRouteMatch({ path: '/keyservers' });
  const onLegacySupportersPath = useRouteMatch({ path: '/investors' });
  const onBeta = useRouteMatch({ path: '/beta' });
  const onQR = useRouteMatch({ path: '/qr' });
  const onSupporters = useRouteMatch({ path: '/supporters' });
  const onDownload = useRouteMatch({ path: '/download' });

  const activePage = React.useMemo(() => {
    if (onPrivacy) {
      return <Privacy />;
    } else if (onTerms) {
      return <Terms />;
    } else if (onSupport) {
      return <Support />;
    } else if (onStory) {
      return <Story />;
    } else if (onKeyservers) {
      return <Keyservers />;
    } else if (onLegacySupportersPath) {
      return <Redirect to="/supporters" />;
    } else if (onBeta) {
      return <Beta />;
    } else if (onQR) {
      return <QR />;
    } else if (onSupporters) {
      return <Supporters />;
    } else if (onDownload) {
      return <Download />;
    } else {
      return <AppLanding />;
    }
  }, [
    onPrivacy,
    onTerms,
    onSupport,
    onStory,
    onKeyservers,
    onLegacySupportersPath,
    onBeta,
    onQR,
    onSupporters,
    onDownload,
  ]);

  let header;
  if (!onQR) {
    header = (
      <Header
        showMobileNav={showMobileNav}
        setShowMobileNav={setShowMobileNav}
      />
    );
  }

  let footer;
  if (!onQR) {
    footer = <Footer />;
  }

  return (
    <div className={css.container}>
      <div className={innerContainerClassName}>
        {header}
        <div className={css.pageContentContainer}>
          <MobileNav
            showMobileNav={showMobileNav}
            setShowMobileNav={setShowMobileNav}
          />
          {activePage}
          {footer}
          {modals}
        </div>
      </div>
    </div>
  );
}

export default Landing;
