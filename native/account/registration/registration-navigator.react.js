// @flow

import {
  createStackNavigator,
  type StackNavigationProp,
  type StackNavigationHelpers,
} from '@react-navigation/stack';
import * as React from 'react';
import { View } from 'react-native';

import KeyserverSelection from './keyserver-selection.react.js';
import KeyboardAvoidingView from '../../components/keyboard-avoiding-view.react.js';
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
type Props = {
  +navigation: RootNavigationProp<'Registration'>,
  ...
};
// eslint-disable-next-line no-unused-vars
function RegistrationNavigator(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.view}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoidingView}
      >
        <Registration.Navigator>
          <Registration.Screen
            name={KeyserverSelectionRouteName}
            component={KeyserverSelection}
          />
        </Registration.Navigator>
      </KeyboardAvoidingView>
    </View>
  );
}

const unboundStyles = {
  keyboardAvoidingView: {
    flex: 1,
  },
  view: {
    flex: 1,
    backgroundColor: 'panelBackground',
  },
};

export default RegistrationNavigator;
