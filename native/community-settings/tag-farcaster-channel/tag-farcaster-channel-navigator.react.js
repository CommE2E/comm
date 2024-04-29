// @flow

import type {
  StackNavigationHelpers,
  StackNavigationProp,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import TagFarcasterChannel from './tag-farcaster-channel.react.js';
import TagUnfollowedFarcasterChannel from './tag-unfollowed-farcaster-channel.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react';
import {
  TagFarcasterChannelRouteName,
  TagUnfollowedFarcasterChannelRouteName,
  type TagFarcasterChannelParamList,
  type ScreenParamList,
} from '../../navigation/route-names.js';
import { useStyles, useColors } from '../../themes/colors.js';

const safeAreaEdges = ['bottom'];

export type TagFarcasterChannelNavigationProp<
  RouteName: $Keys<TagFarcasterChannelParamList> = $Keys<TagFarcasterChannelParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const TagFarcasterChannelStack = createStackNavigator<
  ScreenParamList,
  TagFarcasterChannelParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

type Props = {
  +navigation: RootNavigationProp<'TagFarcasterChannelNavigator'>,
  ...
};

// eslint-disable-next-line no-unused-vars
function TagFarcasterChannelNavigator(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const colors = useColors();

  const screenOptions = React.useMemo(
    () => ({
      headerBackTitleVisible: false,
      headerTintColor: colors.panelForegroundLabel,
      headerLeftContainerStyle: {
        paddingLeft: 12,
      },
      headerStyle: {
        backgroundColor: colors.modalBackground,
      },
      headerTitle: 'Tag a Farcaster channel',
    }),
    [colors.modalBackground, colors.panelForegroundLabel],
  );

  const tagFarcasterChannelNavigator = React.useMemo(
    () => (
      <SafeAreaView edges={safeAreaEdges} style={styles.container}>
        <TagFarcasterChannelStack.Navigator screenOptions={screenOptions}>
          <TagFarcasterChannelStack.Screen
            name={TagFarcasterChannelRouteName}
            component={TagFarcasterChannel}
          />
          <TagFarcasterChannelStack.Screen
            name={TagUnfollowedFarcasterChannelRouteName}
            component={TagUnfollowedFarcasterChannel}
          />
        </TagFarcasterChannelStack.Navigator>
      </SafeAreaView>
    ),
    [screenOptions, styles.container],
  );

  return tagFarcasterChannelNavigator;
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'modalBackground',
  },
};

export default TagFarcasterChannelNavigator;
