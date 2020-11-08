// @flow

import type { StackHeaderProps } from '@react-navigation/stack';

import * as React from 'react';

import Header from '../navigation/header.react';
import { createActiveTabSelector } from '../navigation/nav-selectors';
import { ChatRouteName } from '../navigation/route-names';
import { NavContext } from '../navigation/navigation-context';

const activeTabSelector = createActiveTabSelector(ChatRouteName);

export default React.memo<StackHeaderProps>(function ChatHeader(
  props: StackHeaderProps,
) {
  const navContext = React.useContext(NavContext);
  const activeTab = activeTabSelector(navContext);
  return <Header {...props} activeTab={activeTab} />;
});
