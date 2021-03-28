// @flow

import * as React from 'react';
import { hot } from 'react-hot-loader/root';
import { Router, Route } from 'react-router';

import App from './app.react';
import history from './router-history';
import Socket from './socket.react';

const RootComponent = () => (
  <React.Fragment>
    <Router history={history.getHistoryObject()}>
      <Route path="*" component={App} />
    </Router>
    <Socket />
  </React.Fragment>
);

const HotReloadingRootComponent: React.ComponentType<{||}> = hot(RootComponent);

export default HotReloadingRootComponent;
