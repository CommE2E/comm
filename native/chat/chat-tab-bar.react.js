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

import { threadSettingsNotificationsCopy } from 'lib/shared/thread-settings-notifications-utils.js';

import {
  nuxTip,
  NUXTipsContext,
} from '../components/nux-tips-context.react.js';

const ButtonTitleToTip = Object.freeze({
  [threadSettingsNotificationsCopy.MUTED]: nuxTip.MUTED,
  [threadSettingsNotificationsCopy.HOME]: nuxTip.HOME,
});

export default function TabBarTop(
  props: MaterialTopTabBarProps<Route<>>,
): React.Node {
  const { descriptors } = props;
  const viewRef = React.useRef<?React.ElementRef<typeof View>>();

  const tipsContext = React.useContext(NUXTipsContext);
  invariant(tipsContext, 'NUXTipsContext should be defined');

  const renderTabBarItem = React.useCallback(
    (innerProps: TabBarItemProps<Route<>> & { key: string }) => {
      const onLayout = () => {
        const button = viewRef.current;
        if (!button) {
          return;
        }
        const label = descriptors[innerProps.route.key].options.title;
        invariant(
          label,
          'label has to be defined in chat tab bar for NUX to work',
        );

        const tipType = ButtonTitleToTip[label];
        if (!tipType) {
          return;
        }
        button.measure((x, y, width, height, pageX, pageY) => {
          tipsContext.registerTipButton(tipType, {
            x,
            y,
            width,
            height,
            pageX,
            pageY,
          });
        });
      };

      return (
        <View ref={viewRef} onLayout={onLayout}>
          <TabBarItem {...innerProps} />
        </View>
      );
    },
    [descriptors, tipsContext],
  );

  return <MaterialTopTabBar {...props} renderTabBarItem={renderTabBarItem} />;
}
