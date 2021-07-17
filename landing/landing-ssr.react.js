// @flow

import * as React from 'react';
import { StaticRouter } from 'react-router';

import Landing from './landing.react';

export type LandingSSRProps = {
  +url: string,
  +basename: string,
};
function LandingSSR(props: LandingSSRProps): React.Node {
  const { url, basename } = props;
  const routerContext = React.useMemo(() => ({}), []);
  return (
    <StaticRouter location={url} basename={basename} context={routerContext}>
      <Landing />
    </StaticRouter>
  );
}

export default LandingSSR;
