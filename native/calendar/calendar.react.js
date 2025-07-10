// @flow

import type {
  StackNavigationProp,
  StackNavigationHelpers,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import CalendarScreen from './calendar-screen.react.js';
import CommunityDrawerButton from '../navigation/community-drawer-button.react.js';
import {
  CalendarScreenRouteName,
  type CalendarParamList,
  type ScreenParamList,
} from '../navigation/route-names.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useStyles, useColors } from '../themes/colors.js';

export type CalendarNavigationProp<
  RouteName: $Keys<CalendarParamList> = $Keys<CalendarParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const Calendar = createStackNavigator<
  ScreenParamList,
  CalendarParamList,
  StackNavigationHelpers<ScreenParamList>,
>();
type Props = {
  +navigation: TabNavigationProp<'Calendar'>,
  ...
};

function CalendarComponent(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const headerLeft = React.useCallback(
    () => <CommunityDrawerButton navigation={props.navigation} />,
    [props.navigation],
  );

  const options = React.useMemo(
    () => ({
      headerTitle: 'Calendar',
      headerLeft,
      headerStyle: {
        backgroundColor: colors.tabBarBackground,
      },
      headerShadowVisible: false,
    }),
    [colors.tabBarBackground, headerLeft],
  );

  return (
    <View style={styles.view}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoidingView}
      >
        <Calendar.Navigator>
          <Calendar.Screen
            name={CalendarScreenRouteName}
            component={CalendarScreen}
            options={options}
          />
        </Calendar.Navigator>
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

export default CalendarComponent;
