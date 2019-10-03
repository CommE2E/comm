// @flow

import * as React from 'react';
import { Router, Route } from 'react-router';
import { hot } from 'react-hot-loader/root';

import App from './app.react';
import Socket from './socket.react';
import history from './router-history';

const RootComponent = () => (
  <React.Fragment>
    <Router history={history.getHistoryObject()}>
      <Route path="*" component={App} />
    </Router>
    <Socket />
  </React.Fragment>
);

export default hot(RootComponent);
