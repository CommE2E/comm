// @flow

import {
  createStackNavigator,
  type StackNavigationProp,
  type StackHeaderProps,
} from '@react-navigation/stack';
import * as React from 'react';
import { View } from 'react-native';

import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react';
import HeaderBackButton from '../navigation/header-back-button.react';
import {
  MoreScreenRouteName,
  EditEmailRouteName,
  EditPasswordRouteName,
  DeleteAccountRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
  AppearancePreferencesRouteName,
  FriendListRouteName,
  BlockListRouteName,
  type ScreenParamList,
  type MoreParamList,
} from '../navigation/route-names';
import { useStyles } from '../themes/colors';

import AppearancePreferences from './appearance-preferences.react';
import BuildInfo from './build-info.react';
import DeleteAccount from './delete-account.react';
import DevTools from './dev-tools.react';
import EditEmail from './edit-email.react';
import EditPassword from './edit-password.react';
import MoreHeader from './more-header.react';
import MoreScreen from './more-screen.react';
import RelationshipList from './relationship-list.react';

const header = (props: StackHeaderProps) => <MoreHeader {...props} />;
const headerBackButton = (props) => <HeaderBackButton {...props} />;
const screenOptions = {
  header,
  headerLeft: headerBackButton,
};
const moreScreenOptions = { headerTitle: 'More' };
const editEmailOptions = { headerTitle: 'Change email' };
const editPasswordOptions = { headerTitle: 'Change password' };
const deleteAccountOptions = { headerTitle: 'Delete account' };
const buildInfoOptions = { headerTitle: 'Build info' };
const devToolsOptions = { headerTitle: 'Developer tools' };
const appearanceOptions = { headerTitle: 'Appearance' };
const friendListOptions = {
  headerTitle: 'Friend list',
  headerBackTitle: 'Back',
};
const blockListOptions = {
  headerTitle: 'Block list',
  headerBackTitle: 'Back',
};

export type MoreNavigationProp<
  RouteName: $Keys<MoreParamList> = $Keys<MoreParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const More = createStackNavigator<
  ScreenParamList,
  MoreParamList,
  MoreNavigationProp<>,
>();
function MoreComponent() {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.view}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoidingView}
      >
        <More.Navigator
          screenOptions={screenOptions}
          detachInactiveScreens={false}
        >
          <More.Screen
            name={MoreScreenRouteName}
            component={MoreScreen}
            options={moreScreenOptions}
          />
          <More.Screen
            name={EditEmailRouteName}
            component={EditEmail}
            options={editEmailOptions}
          />
          <More.Screen
            name={EditPasswordRouteName}
            component={EditPassword}
            options={editPasswordOptions}
          />
          <More.Screen
            name={DeleteAccountRouteName}
            component={DeleteAccount}
            options={deleteAccountOptions}
          />
          <More.Screen
            name={BuildInfoRouteName}
            component={BuildInfo}
            options={buildInfoOptions}
          />
          <More.Screen
            name={DevToolsRouteName}
            component={DevTools}
            options={devToolsOptions}
          />
          <More.Screen
            name={AppearancePreferencesRouteName}
            component={AppearancePreferences}
            options={appearanceOptions}
          />
          <More.Screen
            name={FriendListRouteName}
            component={RelationshipList}
            options={friendListOptions}
          />
          <More.Screen
            name={BlockListRouteName}
            component={RelationshipList}
            options={blockListOptions}
          />
        </More.Navigator>
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

export default MoreComponent;
