// @flow

import Header from '../navigation/header.react';
import { createActiveTabSelector } from '../navigation/nav-selectors';
import { ChatRouteName } from '../navigation/route-names';
import {
  connectNav,
  type NavContextType,
} from '../navigation/navigation-context';

const activeTabSelector = createActiveTabSelector(ChatRouteName);

export default connectNav((context: ?NavContextType) => ({
  activeTab: activeTabSelector(context),
}))(Header);
