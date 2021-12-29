// @flow

import * as React from 'react';
import { useRouteMatch } from 'react-router-dom';

import AppLanding from './app-landing.react';
import Footer from './footer.react';
import Header from './header.react';
import Keyservers from './keyservers.react';
import Privacy from './privacy.react';
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
  const onTeam = useRouteMatch({ path: '/team' });

  const scrollToSubscriptionForm = React.useCallback(async (e: Event) => {
    e.preventDefault();
    window?.scrollTo(0, document.body?.scrollHeight);
    document.getElementById('subscription-form')?.focus();
  }, []);

  const activePage = React.useMemo(() => {
    if (onPrivacy) {
      return <Privacy />;
    } else if (onTerms) {
      return <Terms />;
    } else if (onSupport) {
      return <Support />;
    } else if (onKeyservers) {
      return <Keyservers />;
    } else if (onTeam) {
      return <Team />;
    } else {
      return <AppLanding onRequestAccess={scrollToSubscriptionForm} />;
    }
  }, [
    onKeyservers,
    onPrivacy,
    onSupport,
    onTerms,
    scrollToSubscriptionForm,
    onTeam,
  ]);

  return (
    <>
      <Header onRequestAccess={scrollToSubscriptionForm} />
      {activePage}
      <Footer />
    </>
  );
}

export default Landing;
