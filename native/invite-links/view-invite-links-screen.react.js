// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import * as React from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { inviteLinkUrl } from 'lib/facts/links.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import { threadHasPermission } from 'lib/shared/thread-utils.js';
import type { InviteLink } from 'lib/types/link-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import { SingleLine } from '../components/single-line.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  ManagePublicLinkRouteName,
  type NavigationRoute,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles, useColors } from '../themes/colors.js';

export type ViewInviteLinksScreenParams = {
  +community: ThreadInfo,
};

type Props = {
  +navigation: RootNavigationProp<'ViewInviteLinks'>,
  +route: NavigationRoute<'ViewInviteLinks'>,
};

const confirmCopy = () => displayActionResultModal('copied!');

function ViewInviteLinksScreen(props: Props): React.Node {
  const { community } = props.route.params;
  const inviteLink: ?InviteLink = useSelector(primaryInviteLinksSelector)[
    community.id
  ];

  const styles = useStyles(unboundStyles);
  const { modalForegroundLabel } = useColors();
  const linkUrl = inviteLinkUrl(inviteLink?.name ?? '');
  const onPressCopy = React.useCallback(() => {
    Clipboard.setString(linkUrl);
    setTimeout(confirmCopy);
  }, [linkUrl]);

  const { navigate } = props.navigation;
  const onEditButtonClick = React.useCallback(() => {
    navigate<'ManagePublicLink'>({
      name: ManagePublicLinkRouteName,
      params: {
        community,
      },
    });
  }, [community, navigate]);
  const canManageLinks = threadHasPermission(
    community,
    threadPermissions.MANAGE_INVITE_LINKS,
  );
  let publicLinkSection = null;
  if (inviteLink || canManageLinks) {
    let description;
    if (canManageLinks) {
      description = (
        <>
          <Text style={styles.details}>
            Public links allow unlimited uses and never expire.
          </Text>
          <TouchableOpacity onPress={onEditButtonClick}>
            <Text style={[styles.details, styles.editLinkButton]}>
              Edit public link
            </Text>
          </TouchableOpacity>
        </>
      );
    } else {
      description = (
        <Text style={styles.details}>
          Share this invite link to help your friends join your community!
        </Text>
      );
    }
    publicLinkSection = (
      <>
        <Text style={styles.sectionTitle}>PUBLIC LINK</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.link} onPress={onPressCopy}>
            <SingleLine style={styles.linkText}>{linkUrl}</SingleLine>
            <View style={styles.button}>
              <SWMansionIcon
                name="link"
                size={24}
                color={modalForegroundLabel}
              />
              <Text style={styles.copy}>Copy</Text>
            </View>
          </TouchableOpacity>
          {description}
        </View>
      </>
    );
  }
  return <View style={styles.container}>{publicLinkSection}</View>;
}

const unboundStyles = {
  container: {
    flex: 1,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    color: 'modalBackgroundLabel',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  section: {
    borderBottomColor: 'modalSeparator',
    borderBottomWidth: 1,
    borderTopColor: 'modalSeparator',
    borderTopWidth: 1,
    backgroundColor: 'modalForeground',
    padding: 16,
  },
  link: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 16,
    backgroundColor: 'inviteLinkButtonBackground',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    color: 'inviteLinkLinkColor',
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    color: 'modalForegroundLabel',
    paddingLeft: 8,
  },
  details: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    color: 'modalForegroundLabel',
  },
  editLinkButton: {
    color: 'purpleLink',
  },
};

export default ViewInviteLinksScreen;
