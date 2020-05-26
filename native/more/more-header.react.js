// @flow

import Header from '../navigation/header.react';
import { createActiveTabSelector } from '../navigation/nav-selectors';
import { MoreRouteName } from '../navigation/route-names';
import {
  connectNav,
  type NavContextType,
} from '../navigation/navigation-context';

const activeTabSelector = createActiveTabSelector(MoreRouteName);

export default connectNav((context: ?NavContextType) => ({
  activeTab: activeTabSelector(context),
}))(Header);
