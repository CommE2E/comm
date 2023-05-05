// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import * as React from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import type { InviteLink } from 'lib/types/link-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
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
  const linkUrl = `https://comm.app/invite/${inviteLink?.name ?? ''}`;
  const onPressCopy = React.useCallback(() => {
    Clipboard.setString(linkUrl);
    setTimeout(confirmCopy);
  }, [linkUrl]);

  let publicLinkSection = null;
  if (inviteLink) {
    publicLinkSection = (
      <>
        <Text style={styles.sectionTitle}>PUBLIC LINK</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.link} onPress={onPressCopy}>
            <Text style={styles.linkText}>{linkUrl}</Text>
            <View style={styles.button}>
              <SWMansionIcon
                name="link"
                size={24}
                color={modalForegroundLabel}
              />
              <Text style={styles.copy}>Copy</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.details}>
            Use this public link to invite your friends into the community!
          </Text>
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
    paddingTop: 16,
  },
};

export default ViewInviteLinksScreen;
