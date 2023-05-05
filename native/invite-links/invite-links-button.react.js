// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import {
  InviteLinkNavigatorRouteName,
  ViewInviteLinksRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +community: ThreadInfo,
};

function InviteLinksButton(props: Props): React.Node {
  const { community } = props;
  const inviteLink = useSelector(primaryInviteLinksSelector)[community.id];

  const { navigate } = useNavigation();
  const navigateToInviteLinksView = React.useCallback(() => {
    if (!inviteLink || !community) {
      return;
    }
    navigate<'InviteLinkNavigator'>(InviteLinkNavigatorRouteName, {
      screen: ViewInviteLinksRouteName,
      params: {
        community,
      },
    });
  }, [community, inviteLink, navigate]);

  const insets = useSafeAreaInsets();
  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const styles = useStyles(unboundStyles);

  const { showActionSheetWithOptions } = useActionSheet();
  const options = React.useMemo(() => ['Invite Link', 'Cancel'], []);

  const openActionSheet = React.useCallback(() => {
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 1,
        containerStyle: {
          paddingBottom: insets.bottom,
        },
        userInterfaceStyle: activeTheme ?? 'dark',
      },
      selectedIndex => {
        if (selectedIndex === 0) {
          navigateToInviteLinksView();
        }
      },
    );
  }, [
    activeTheme,
    insets.bottom,
    navigateToInviteLinksView,
    options,
    showActionSheetWithOptions,
  ]);

  if (!inviteLink) {
    return null;
  }
  return (
    <TouchableOpacity onPress={openActionSheet}>
      <SWMansionIcon name="menu-vertical" size={22} style={styles.button} />
    </TouchableOpacity>
  );
}

const unboundStyles = {
  button: {
    color: 'drawerItemLabelLevel0',
  },
};

export default InviteLinksButton;
