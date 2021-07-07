// @flow

import * as React from 'react';
import { StaticRouter } from 'react-router';

import Landing from './landing.react';

export type Props = {|
  +url: string,
|};
function LandingSSR(props: Props): React.Node {
  const { url } = props;
  const routerContext = React.useMemo(() => ({}), []);
  return (
    <StaticRouter
      location={url}
      basename="/commlanding"
      context={routerContext}
    >
      <Landing url={url} />
    </StaticRouter>
  );
}

export default LandingSSR;
