// @flow

import {
  createStackNavigator,
  type StackNavigationHelpers,
  type StackNavigationProp,
} from '@react-navigation/stack';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import ManagePublicLinkScreen from './manage-public-link-screen.react.js';
import ViewInviteLinksHeaderLeftButton from './view-invite-links-header-left-button.react.js';
import ViewInviteLinksScreen from './view-invite-links-screen.react.js';
import HeaderBackButton from '../navigation/header-back-button.react.js';
import { defaultStackScreenOptions } from '../navigation/options.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type InviteLinkParamList,
  ViewInviteLinksRouteName,
  type ScreenParamList,
  ManagePublicLinkRouteName,
} from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';

const safeAreaEdges = ['bottom'];

export type InviteLinksNavigationProps<
  RouteName: $Keys<InviteLinkParamList> = $Keys<InviteLinkParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const InviteLinksStack = createStackNavigator<
  ScreenParamList,
  InviteLinkParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

const viewInviteLinksOptions = {
  headerTitle: 'Invite link',
  headerLeft: ViewInviteLinksHeaderLeftButton,
  headerBackImage: () => null,
  headerBackTitleStyle: { marginLeft: 20 },
};

const managePublicLinkOptions = {
  headerTitle: 'Public link',
  headerBackTitleVisible: false,
  headerLeft: HeaderBackButton,
};

type Props = {
  +navigation: RootNavigationProp<'InviteLinkNavigator'>,
  ...
};
// eslint-disable-next-line no-unused-vars
function InviteLinksNavigator(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const screenOptions = React.useMemo(
    () => ({
      ...defaultStackScreenOptions,
      headerStyle: {
        backgroundColor: colors.modalBackground,
        borderBottomWidth: 1,
      },
    }),
    [colors.modalBackground],
  );
  return (
    <SafeAreaView style={styles.container} edges={safeAreaEdges}>
      <InviteLinksStack.Navigator screenOptions={screenOptions}>
        <InviteLinksStack.Screen
          name={ViewInviteLinksRouteName}
          component={ViewInviteLinksScreen}
          options={viewInviteLinksOptions}
        />
        <InviteLinksStack.Screen
          name={ManagePublicLinkRouteName}
          component={ManagePublicLinkScreen}
          options={managePublicLinkOptions}
        />
      </InviteLinksStack.Navigator>
    </SafeAreaView>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'modalBackground',
  },
};

export default InviteLinksNavigator;
