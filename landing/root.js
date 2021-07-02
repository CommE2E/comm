// @flow

import * as React from 'react';
import { hot } from 'react-hot-loader/root';

import Landing from './landing.react';

function RootComponent() {
  const currentURL = window.location.href;
  return <Landing url={currentURL} />;
}

const HotReloadingRootComponent: React.ComponentType<{||}> = hot(RootComponent);

export default HotReloadingRootComponent;
