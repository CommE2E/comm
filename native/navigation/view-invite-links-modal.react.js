// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import * as React from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import type { InviteLink } from 'lib/types/link-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import { displayActionResultModal } from './action-result-modal.js';
import type { RootNavigationProp } from './root-navigator.react.js';
import type { NavigationRoute } from './route-names.js';
import Modal from '../components/modal.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useStyles, useColors } from '../themes/colors.js';

export type ViewInviteLinksModalParams = {
  +community: ThreadInfo,
  +inviteLink: InviteLink,
};

type Props = {
  +navigation: RootNavigationProp<'ViewInviteLinksModal'>,
  +route: NavigationRoute<'ViewInviteLinksModal'>,
};

const confirmCopy = () => displayActionResultModal('copied!');

function ViewInviteLinksModal(props: Props): React.Node {
  const { community, inviteLink } = props.route.params;
  const styles = useStyles(unboundStyles);
  const { modalForegroundLabel } = useColors();
  const linkUrl = `https://comm.app/invite/${inviteLink.name}`;
  const onPressCopy = React.useCallback(() => {
    Clipboard.setString(linkUrl);
    setTimeout(confirmCopy);
  }, [linkUrl]);
  const { uiName } = useResolvedThreadInfo(community);
  return (
    <Modal modalStyle={styles.modal}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{`Invite people to ${uiName}`}</Text>
      </View>
      <View style={styles.content}>
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
      </View>
    </Modal>
  );
}

const unboundStyles = {
  modal: {
    padding: 0,
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomColor: 'modalSeparator',
    borderBottomWidth: 1,
    flex: 0,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: 'inviteLinkHeaderColor',
  },
  content: {
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
    color: 'inviteLinkHeaderColor',
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

export default ViewInviteLinksModal;
