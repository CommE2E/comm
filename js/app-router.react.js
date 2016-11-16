// @flow

import type { SquadInfo } from './squad-info';
import type { AppState } from './redux-reducer';

import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { Router, Route, Redirect } from 'react-router';

import App from './app.react';
import history from './router-history';
import { thisNavURLFragment } from './nav-utils';

type Props = {
  thisNavURLFragment: string,
}

function AppRouter(props: Props) {
  return (
    <Router history={history}>
      <Redirect from="/" to={props.thisNavURLFragment} />
      <Route
        path="(home/)(squad/:squadID/)(year/:year/)(month/:month/)"
        component={App}
      />
    </Router>
  );
}

export default connect((state: AppState) => ({
  thisNavURLFragment: thisNavURLFragment(state),
}))(AppRouter);
