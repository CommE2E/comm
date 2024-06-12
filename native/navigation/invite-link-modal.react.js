// @flow

import * as React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import {
  inviteLinkTexts,
  useAcceptInviteLink,
} from 'lib/hooks/invite-links.js';
import type { LinkStatus } from 'lib/hooks/invite-links.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import type { KeyserverOverride } from 'lib/shared/invite-links';
import type { InviteLinkVerificationResponse } from 'lib/types/link-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types';

import { nonThreadCalendarQuery } from './nav-selectors.js';
import { NavContext } from './navigation-context.js';
import type { RootNavigationProp } from './root-navigator.react.js';
import type { NavigationRoute } from './route-names.js';
import { useNavigateToThread } from '../chat/message-list-types.js';
import Button from '../components/button.react.js';
import Modal from '../components/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

export type InviteLinkModalParams = {
  +invitationDetails: InviteLinkVerificationResponse,
  +secret: string,
  +keyserverOverride?: ?KeyserverOverride,
};

type Props = {
  +navigation: RootNavigationProp<'InviteLinkModal'>,
  +route: NavigationRoute<'InviteLinkModal'>,
};

function InviteLinkModal(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { invitationDetails, secret, keyserverOverride } = props.route.params;
  const [linkStatus, setLinkStatus] = React.useState<LinkStatus>(
    invitationDetails.status === 'expired'
      ? 'invalid'
      : invitationDetails.status,
  );

  const navContext = React.useContext(NavContext);
  const calendarQuery = useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );

  const navigateToThreadWithParams = useNavigateToThread();
  const navigateToThread = React.useCallback(
    (threadInfo: ThreadInfo) => {
      navigateToThreadWithParams({ threadInfo });
    },
    [navigateToThreadWithParams],
  );

  const { join, joinLoadingStatus } = useAcceptInviteLink({
    verificationResponse: invitationDetails,
    inviteSecret: secret,
    keyserverOverride,
    calendarQuery,
    closeModal: props.navigation.goBack,
    setLinkStatus,
    navigateToThread,
  });

  const header = React.useMemo(() => {
    if (invitationDetails.status === 'valid' && linkStatus === 'valid') {
      let additionalCommunityDescription = null;
      if (invitationDetails.thread) {
        additionalCommunityDescription = (
          <>
            <Text style={styles.communityIntro}>within</Text>
            <Text style={styles.threadName}>
              {invitationDetails.community.name}
            </Text>
          </>
        );
      }
      const targetName =
        invitationDetails.thread?.name ?? invitationDetails.community.name;
      return (
        <>
          <Text style={styles.invitation}>You have been invited to join</Text>
          <Text style={styles.threadName}>{targetName}</Text>
          {additionalCommunityDescription}
        </>
      );
    }
    return (
      <>
        <Text style={styles.invalidInviteTitle}>
          {inviteLinkTexts[linkStatus].header}
        </Text>
        <Text style={styles.invalidInviteExplanation}>
          {inviteLinkTexts[linkStatus].message}
        </Text>
      </>
    );
  }, [
    invitationDetails,
    styles.threadName,
    styles.communityIntro,
    styles.invalidInviteExplanation,
    styles.invalidInviteTitle,
    styles.invitation,
    linkStatus,
  ]);

  const threadInfos = useSelector(threadInfoSelector);
  const closeModal = React.useCallback(() => {
    const threadID =
      invitationDetails.thread?.id ?? invitationDetails.community?.id;
    if (linkStatus === 'already_joined' && threadID && threadInfos[threadID]) {
      navigateToThread(threadInfos[threadID]);
    } else {
      props.navigation.goBack();
    }
  }, [
    invitationDetails.community?.id,
    invitationDetails.thread?.id,
    linkStatus,
    navigateToThread,
    props.navigation,
    threadInfos,
  ]);

  const buttons = React.useMemo(() => {
    if (linkStatus === 'valid') {
      const joinButtonContent =
        joinLoadingStatus === 'loading' ? (
          <ActivityIndicator
            size="small"
            color="white"
            style={styles.activityIndicatorStyle}
          />
        ) : (
          <Text style={styles.buttonText}>Accept invite</Text>
        );
      return (
        <>
          <Button
            style={[styles.button, styles.buttonPrimary, styles.gap]}
            onPress={join}
            disabled={joinLoadingStatus === 'loading'}
          >
            {joinButtonContent}
          </Button>
          <Button
            style={[styles.button, styles.buttonSecondary]}
            onPress={props.navigation.goBack}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </Button>
        </>
      );
    }
    return (
      <Button
        style={[styles.button, styles.buttonPrimary]}
        onPress={closeModal}
      >
        <Text style={styles.buttonText}>Return to Comm</Text>
      </Button>
    );
  }, [
    closeModal,
    join,
    joinLoadingStatus,
    linkStatus,
    props.navigation.goBack,
    styles.activityIndicatorStyle,
    styles.button,
    styles.buttonPrimary,
    styles.buttonSecondary,
    styles.buttonText,
    styles.gap,
  ]);

  return (
    <Modal modalStyle={styles.modal}>
      <View>{header}</View>
      <View style={styles.separator} />
      <View>{buttons}</View>
    </Modal>
  );
}

const unboundStyles = {
  modal: {
    backgroundColor: 'modalForeground',
    paddingVertical: 24,
    paddingHorizontal: 16,
    flex: 0,
  },
  invitation: {
    color: 'whiteText',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: 24,
  },
  communityIntro: {
    color: 'whiteText',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 16,
  },
  threadName: {
    color: 'whiteText',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  invalidInviteTitle: {
    color: 'whiteText',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 28,
    marginBottom: 24,
  },
  invalidInviteExplanation: {
    color: 'whiteText',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
  },
  separator: {
    height: 1,
    backgroundColor: 'modalSeparator',
    marginVertical: 24,
  },
  gap: {
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonPrimary: {
    backgroundColor: 'purpleButton',
  },
  buttonSecondary: {
    borderColor: 'secondaryButtonBorder',
    borderWidth: 1,
  },
  buttonText: {
    color: 'whiteText',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  activityIndicatorStyle: {
    paddingVertical: 2,
  },
};

export default InviteLinkModal;
