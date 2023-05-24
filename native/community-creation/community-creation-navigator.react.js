// @flow

import {
  createStackNavigator,
  type StackNavigationProp,
  type StackNavigationHelpers,
} from '@react-navigation/stack';
import * as React from 'react';

import CommunityConfiguration from './community-configuration.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  CommunityConfigurationRouteName,
  type ScreenParamList,
  type CommunityCreationParamList,
} from '../navigation/route-names.js';
import { useColors } from '../themes/colors.js';

export type CommunityCreationNavigationProp<
  RouteName: $Keys<CommunityCreationParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const CommunityCreation = createStackNavigator<
  ScreenParamList,
  CommunityCreationParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

const communityConfigurationOptions = {
  headerTitle: 'Create a community',
};

type Props = {
  +navigation: RootNavigationProp<'CommunityCreation'>,
  ...
};
// eslint-disable-next-line no-unused-vars
function CommunityCreationNavigator(props: Props): React.Node {
  const colors = useColors();

  const communityCreationScreenOptions = React.useMemo(
    () => ({
      headerTransparent: true,
      headerBackTitleVisible: false,
      headerTintColor: colors.panelForegroundLabel,
      headerLeftContainerStyle: {
        paddingLeft: 12,
      },
    }),
    [colors.panelForegroundLabel],
  );

  return (
    <CommunityCreation.Navigator screenOptions={communityCreationScreenOptions}>
      <CommunityCreation.Screen
        name={CommunityConfigurationRouteName}
        component={CommunityConfiguration}
        options={communityConfigurationOptions}
      />
    </CommunityCreation.Navigator>
  );
}

export default CommunityCreationNavigator;
