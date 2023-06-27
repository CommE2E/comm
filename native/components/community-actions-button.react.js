// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import { threadHasPermission } from 'lib/shared/thread-utils.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import SWMansionIcon from './swmansion-icon.react.js';
import {
  InviteLinkNavigatorRouteName,
  ManagePublicLinkRouteName,
  ViewInviteLinksRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +community: ThreadInfo,
};

function CommunityActionsButton(props: Props): React.Node {
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
  const navigateToManagePublicLinkView = React.useCallback(() => {
    navigate<'InviteLinkNavigator'>(InviteLinkNavigatorRouteName, {
      screen: ManagePublicLinkRouteName,
      params: {
        community,
      },
    });
  }, [community, navigate]);

  const insets = useSafeAreaInsets();
  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const styles = useStyles(unboundStyles);

  const { showActionSheetWithOptions } = useActionSheet();
  const actions = React.useMemo(() => {
    if (!community) {
      return null;
    }

    const result = [];
    const canManageLinks = threadHasPermission(
      community,
      threadPermissions.MANAGE_INVITE_LINKS,
    );
    if (canManageLinks) {
      result.push({
        label: 'Manage invite links',
        action: navigateToManagePublicLinkView,
      });
    }

    if (inviteLink) {
      result.push({
        label: 'Invite link',
        action: navigateToInviteLinksView,
      });
    }

    const canChangeRoles = threadHasPermission(
      community,
      threadPermissions.CHANGE_ROLE,
    );
    if (canChangeRoles) {
      result.push({
        label: 'Manage roles',
        action: () => {},
      });
    }

    if (result.length > 0) {
      return result;
    }
    return null;
  }, [
    community,
    inviteLink,
    navigateToInviteLinksView,
    navigateToManagePublicLinkView,
  ]);

  const openActionSheet = React.useCallback(() => {
    if (!actions) {
      return;
    }
    const options = [...actions.map(a => a.label), 'Cancel'];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        containerStyle: {
          paddingBottom: insets.bottom,
        },
        userInterfaceStyle: activeTheme ?? 'dark',
      },
      selectedIndex => {
        if (selectedIndex !== undefined && selectedIndex < actions.length) {
          actions[selectedIndex].action();
        }
      },
    );
  }, [actions, activeTheme, insets.bottom, showActionSheetWithOptions]);

  let button = null;
  if (actions) {
    button = (
      <TouchableOpacity onPress={openActionSheet}>
        <SWMansionIcon name="menu-vertical" size={22} style={styles.button} />
      </TouchableOpacity>
    );
  }
  return <View style={styles.container}>{button}</View>;
}

const unboundStyles = {
  button: {
    color: 'drawerItemLabelLevel0',
  },
  container: {
    width: 22,
  },
};

export default CommunityActionsButton;
