// @flow

import type {
  MaterialTopTabBarProps,
  Route,
  TabBarItemProps,
} from '@react-navigation/core';
import { MaterialTopTabBar } from '@react-navigation/material-top-tabs';
import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';
import { TabBarItem } from 'react-native-tab-view';

import {
  nuxTip,
  NUXTipsContext,
} from '../components/nux-tips-context.react.js';
import {
  HomeChatThreadListRouteName,
  BackgroundChatThreadListRouteName,
} from '../navigation/route-names.js';

const ButtonTitleToTip = Object.freeze({
  [BackgroundChatThreadListRouteName]: nuxTip.MUTED,
  [HomeChatThreadListRouteName]: nuxTip.HOME,
});

function TabBarButton(props: TabBarItemProps<Route<>>) {
  const tipsContext = React.useContext(NUXTipsContext);
  invariant(tipsContext, 'NUXTipsContext should be defined');

  const viewRef = React.useRef<?React.ElementRef<typeof View>>();
  const onLayout = React.useCallback(() => {
    const tipType = ButtonTitleToTip[props.route.name];
    if (!tipType) {
      return;
    }
    tipsContext.registerTipButton(tipType, viewRef.current);
  }, [props.route.name, tipsContext]);

  return (
    <View ref={viewRef} onLayout={onLayout}>
      <TabBarItem {...props} />
    </View>
  );
}

export default function TabBarTop(
  props: MaterialTopTabBarProps<Route<>>,
): React.Node {
  const renderTabBarItem = React.useCallback(
    (
      innerProps: $ReadOnly<{ ...TabBarItemProps<Route<>>, +key: string, ... }>,
    ) => <TabBarButton {...innerProps} />,
    [],
  );

  return <MaterialTopTabBar {...props} renderTabBarItem={renderTabBarItem} />;
}
