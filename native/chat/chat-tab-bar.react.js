// @flow

import type { MaterialTopTabBarProps } from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import ChatTabBarButton from './chat-tab-bar-button.react.js';
import { NUXTipsContext } from '../components/nux-tips-context.react.js';
import { useStyles } from '../themes/colors.js';

const unboundStyles = {
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    height: 48,
  },
};

export default function TabBar(props: MaterialTopTabBarProps): React.Node {
  const styles = useStyles(unboundStyles);
  const { state, descriptors, navigation } = props;

  const tipsContext = React.useContext(NUXTipsContext);
  invariant(tipsContext, 'NUXTipsContext should be defined');

  const buttons = React.useMemo(
    () =>
      state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const { title, tabBarIcon } = options;
        invariant(
          title && tabBarIcon,
          'title and tabBarIcon should be defined',
        );

        const isFocused = state.index === index;

        const onPress = () => {
          // $FlowFixMe
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          // $FlowFixMe
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <ChatTabBarButton
            title={title}
            tabBarIcon={tabBarIcon}
            onPress={onPress}
            onLongPress={onLongPress}
            isFocused={isFocused}
            key={index}
          />
        );
      }),
    [descriptors, navigation, state.index, state.routes],
  );
  return <View style={styles.container}>{buttons}</View>;
}
