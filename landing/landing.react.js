// @flow

import * as React from 'react';

import Home from './home.react';
import css from './landing.css';
import Privacy from './privacy.react';
import SubscriptionForm from './subscription-form.react';
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
      <div className={css.header_grid}>
        <a href="#" onClick={navigateToHome}>
          <h1 className={css.logo}>Comm</h1>
        </a>
      </div>
      {visibleNode}
      <div className={css.footer_blur}>
        <div className={css.footer_grid}>
          <div className={css.sitemap}>
            <div className={css.footer_logo}>
              <a href="#" onClick={navigateToHome}>
                Comm
              </a>
            </div>

            <a href="#" onClick={navigateToTerms}>
              Terms of Use
            </a>
            <a href="#" onClick={navigateToPrivacy}>
              Privacy Policy
            </a>
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
