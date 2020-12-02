// @flow

import type { StackHeaderProps } from '@react-navigation/stack';
import * as React from 'react';

import Header from '../navigation/header.react';
import { createActiveTabSelector } from '../navigation/nav-selectors';
import { NavContext } from '../navigation/navigation-context';
import { MoreRouteName } from '../navigation/route-names';

const activeTabSelector = createActiveTabSelector(MoreRouteName);

export default React.memo<StackHeaderProps>(function MoreHeader(
  props: StackHeaderProps,
) {
  const navContext = React.useContext(NavContext);
  const activeTab = activeTabSelector(navContext);
  return <Header {...props} activeTab={activeTab} />;
});
