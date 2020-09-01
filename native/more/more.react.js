// @flow

import type { StackNavigationProp } from '@react-navigation/stack';

import * as React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import MoreScreen from './more-screen.react';
import EditEmail from './edit-email.react';
import EditPassword from './edit-password.react';
import DeleteAccount from './delete-account.react';
import BuildInfo from './build-info.react';
import DevTools from './dev-tools.react';
import AppearancePreferences from './appearance-preferences.react';
import RelationshipList from './relationship-list.react';
import RelationshipListAddButton from './relationship-list-add-button.react';
import {
  MoreScreenRouteName,
  EditEmailRouteName,
  EditPasswordRouteName,
  DeleteAccountRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
  AppearancePreferencesRouteName,
  FriendListRouteName,
  RelationshipUpdateModalRouteName,
  BlockListRouteName,
  type ScreenParamList,
  type MoreParamList,
} from '../navigation/route-names';
import MoreHeader from './more-header.react';
import HeaderBackButton from '../navigation/header-back-button.react';

const header = props => <MoreHeader {...props} />;
const headerBackButton = props => <HeaderBackButton {...props} />;
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
const friendListOptions = ({ navigation }) => ({
  headerTitle: 'Friend list',
  // eslint-disable-next-line react/display-name
  headerRight: () => (
    <RelationshipListAddButton
      onPress={() => {
        navigation.navigate({
          name: RelationshipUpdateModalRouteName,
          params: {
            target: 'friends',
          },
        });
      }}
    />
  ),
  headerBackTitle: 'Back',
});
const blockListOptions = ({ navigation }) => ({
  headerTitle: 'Block list',
  // eslint-disable-next-line react/display-name
  headerRight: () => (
    <RelationshipListAddButton
      onPress={() => {
        navigation.navigate({
          name: RelationshipUpdateModalRouteName,
          params: {
            target: 'blocked',
          },
        });
      }}
    />
  ),
  headerBackTitle: 'Back',
});

export type MoreNavigationProp<
  RouteName: $Keys<MoreParamList> = $Keys<MoreParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const More = createStackNavigator<
  ScreenParamList,
  MoreParamList,
  MoreNavigationProp<>,
>();
const MoreComponent = () => (
  <More.Navigator screenOptions={screenOptions}>
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
);
export default MoreComponent;
