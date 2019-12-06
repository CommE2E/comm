// @flow

import type { AppState } from '../redux/redux-setup';
import type { HeaderProps } from 'react-navigation-stack';

import * as React from 'react';

import { connect } from 'lib/utils/redux-utils';

import Header from '../navigation/header.react';
import { createActiveTabSelector } from '../selectors/nav-selectors';
import { MoreRouteName } from '../navigation/route-names';

const activeTabSelector = createActiveTabSelector(MoreRouteName);

const MoreHeader = connect((state: AppState) => ({
  activeTab: activeTabSelector(state),
}))(Header);

export default (props: $Exact<HeaderProps>) => (<MoreHeader {...props} />);
