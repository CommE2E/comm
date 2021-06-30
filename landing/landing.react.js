// @flow

import * as React from 'react';

import Home from './home.react';
import Privacy from './privacy.react';
import Terms from './terms.react';

export type ActivePage = 'home' | 'terms' | 'privacy';

function Landing(): React.Node {
  const [activePage, setActivePage] = React.useState<ActivePage>('home');
  const navigateToHome = React.useCallback(() => setActivePage('home'), []);
  const navigateToTerms = React.useCallback(() => setActivePage('terms'), []);
  const navigateToPrivacy = React.useCallback(
    () => setActivePage('privacy'),
    [],
  );

  let visibleNode;
  if (activePage === 'home') {
    visibleNode = <Home />;
  } else if (activePage === 'terms') {
    visibleNode = <Terms />;
  } else if (activePage === 'privacy') {
    visibleNode = <Privacy />;
  }

  return (
    <>
      {visibleNode}
      <a href="#" onClick={navigateToHome}>
        Home
      </a>
      <a href="#" onClick={navigateToTerms}>
        Terms of Service
      </a>
      <a href="#" onClick={navigateToPrivacy}>
        Privacy Policy
      </a>
    </>
  );
}

export default Landing;
