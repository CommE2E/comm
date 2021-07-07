// @flow

import * as React from 'react';
import { hot } from 'react-hot-loader/root';
import { BrowserRouter } from 'react-router-dom';

import Landing from './landing.react';

function RootComponent() {
  return (
    <BrowserRouter basename="/commlanding">
      <Landing url={window.location.href} />
    </BrowserRouter>
  );
}

const HotReloadingRootComponent: React.ComponentType<{||}> = hot(RootComponent);

export default HotReloadingRootComponent;
