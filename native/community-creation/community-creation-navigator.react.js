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

export type CommunityCreationNavigationProp<
  RouteName: $Keys<CommunityCreationParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const CommunityCreation = createStackNavigator<
  ScreenParamList,
  CommunityCreationParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

const screenOptions = {
  headerTransparent: true,
  headerBackTitleVisible: false,
  headerTitle: 'Create a community',
  headerTintColor: 'white',
  headerLeftContainerStyle: {
    paddingLeft: 12,
  },
};

type Props = {
  +navigation: RootNavigationProp<'CommunityCreation'>,
  ...
};
// eslint-disable-next-line no-unused-vars
function CommunityCreationNavigator(props: Props): React.Node {
  return (
    <CommunityCreation.Navigator screenOptions={screenOptions}>
      <CommunityCreation.Screen
        name={CommunityConfigurationRouteName}
        component={CommunityConfiguration}
      />
    </CommunityCreation.Navigator>
  );
}

export default CommunityCreationNavigator;
