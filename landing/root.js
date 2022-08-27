// @flow

import * as React from 'react';
import { hot } from 'react-hot-loader/root';
import { BrowserRouter } from 'react-router-dom';

import Landing from './landing.react';

declare var routerBasename: string;

function RootComponent() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Landing />
    </BrowserRouter>
  );
}

const HotReloadingRootComponent: React.ComponentType<{}> = hot(RootComponent);

export default HotReloadingRootComponent;
