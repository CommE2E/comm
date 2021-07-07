// @flow

import * as React from 'react';
import { Switch, Route, Link, useLocation } from 'react-router-dom';

import Home from './home.react';
import css from './landing.css';
import Privacy from './privacy.react';
import SubscriptionForm from './subscription-form.react';
import Support from './support.react';
import Terms from './terms.react';

export type LandingProps = {|
  +url: string,
|};
function Landing(props: LandingProps): React.Node {
  const { url } = props; // eslint-disable-line

  const { pathname } = useLocation();
  React.useEffect(() => {
    window?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <div className={css.header_grid}>
        <Link to="/">
          <h1 className={css.logo}>Comm</h1>
        </Link>
      </div>

      <Switch>
        <Route path="/support" component={Support} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/" component={Home} />
      </Switch>

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
