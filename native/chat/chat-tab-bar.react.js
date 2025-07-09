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
import type { MeasureOnSuccessCallback } from 'react-native';
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

const onLayout = () => {};

function TabBarButton(props: TabBarItemProps<Route<>>) {
  const tipsContext = React.useContext(NUXTipsContext);
  invariant(tipsContext, 'NUXTipsContext should be defined');
  const { registerTipButton } = tipsContext;

  const registerRef: React.RefSetter<React.ElementRef<typeof View>> =
    React.useCallback(
      element => {
        const tipType = ButtonTitleToTip[props.route.name];
        if (!tipType) {
          return;
        }
        const measure = (callback: MeasureOnSuccessCallback) =>
          element?.measure(callback);
        registerTipButton(tipType, measure);
      },
      [props.route.name, registerTipButton],
    );

  return (
    <View ref={registerRef} onLayout={onLayout}>
      <TabBarItem {...props} />
    </View>
  );
}

export default function TabBarTop(
  props: MaterialTopTabBarProps<Route<>>,
): React.Node {
  const renderTabBarItem = React.useCallback(
    ({
      key,
      ...innerProps
    }: $ReadOnly<{ ...TabBarItemProps<Route<>>, +key: string, ... }>) => (
      <TabBarButton kwy={key} {...innerProps} />
    ),
    [],
  );

  return <MaterialTopTabBar {...props} renderTabBarItem={renderTabBarItem} />;
}
