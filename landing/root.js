// @flow

import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';

import Landing from './landing.react';

declare var routerBasename: string;

function RootComponent(): React.Node {
  return (
    <BrowserRouter basename={routerBasename}>
      <Landing />
    </BrowserRouter>
  );
}

export default RootComponent;
