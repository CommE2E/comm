// @flow

import type {
  StackNavigationHelpers,
  StackNavigationProp,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import TagFarcasterChannel from './tag-farcaster-channel.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react';
import {
  TagFarcasterChannelRouteName,
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

const tagFarcasterChannelOptions = {
  headerTitle: 'Tag a Farcaster channel',
};

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
            options={tagFarcasterChannelOptions}
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
