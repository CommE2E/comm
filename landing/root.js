// @flow

import * as React from 'react';
import { hot } from 'react-hot-loader/root';

import Landing from './landing.react';

function RootComponent() {
  return <Landing />;
}

export default hot(RootComponent);
