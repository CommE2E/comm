// @flow

import {
  createStackNavigator,
  type StackNavigationProp,
  type StackNavigationHelpers,
} from '@react-navigation/stack';
import * as React from 'react';
import { View } from 'react-native';

import KeyserverSelection from './keyserver-selection.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  KeyserverSelectionRouteName,
  type ScreenParamList,
  type RegistrationParamList,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

export type RegistrationNavigationProp<
  RouteName: $Keys<RegistrationParamList> = $Keys<RegistrationParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const Registration = createStackNavigator<
  ScreenParamList,
  RegistrationParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

const screenOptions = {
  headerTransparent: true,
  headerBackTitleVisible: false,
  headerTitle: '',
  headerTintColor: 'white',
  headerLeftContainerStyle: {
    paddingLeft: 12,
  },
};

type Props = {
  +navigation: RootNavigationProp<'Registration'>,
  ...
};
// eslint-disable-next-line no-unused-vars
function RegistrationNavigator(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.view}>
      <Registration.Navigator screenOptions={screenOptions}>
        <Registration.Screen
          name={KeyserverSelectionRouteName}
          component={KeyserverSelection}
        />
      </Registration.Navigator>
    </View>
  );
}

const unboundStyles = {
  view: {
    flex: 1,
    backgroundColor: 'panelBackground',
  },
};

export default RegistrationNavigator;
