// @flow

import * as React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import { useAcceptInviteLink } from 'lib/hooks/invite-links.js';
import type { LinkStatus } from 'lib/hooks/invite-links.js';
import type { KeyserverOverride } from 'lib/shared/invite-links';
import type { InviteLinkVerificationResponse } from 'lib/types/link-types.js';

import { nonThreadCalendarQuery } from './nav-selectors.js';
import { NavContext } from './navigation-context.js';
import type { RootNavigationProp } from './root-navigator.react.js';
import type { NavigationRoute } from './route-names.js';
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
    invitationDetails.status === 'valid' ? 'valid' : 'invalid',
  );

  const navContext = React.useContext(NavContext);
  const calendarQuery = useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );

  const { joinCommunity, joinThreadLoadingStatus } = useAcceptInviteLink({
    verificationResponse: invitationDetails,
    inviteSecret: secret,
    keyserverOverride,
    calendarQuery,
    onFinish: props.navigation.goBack,
    setLinkStatus,
  });

  const header = React.useMemo(() => {
    if (invitationDetails.status === 'valid' && linkStatus === 'valid') {
      return (
        <>
          <Text style={styles.invitation}>You have been invited to join</Text>
          <Text style={styles.communityName}>
            {invitationDetails.community.name}
          </Text>
        </>
      );
    }
    const headerText = linkStatus === 'invalid' ? 'Invite invalid' : 'Timeout';
    const message =
      linkStatus === 'invalid'
        ? 'This invite link may be expired. Please try again with another ' +
          'invite link.'
        : 'The request has timed out.';
    return (
      <>
        <Text style={styles.invalidInviteTitle}>{headerText}</Text>
        <Text style={styles.invalidInviteExplanation}>{message}</Text>
      </>
    );
  }, [
    invitationDetails,
    styles.communityName,
    styles.invalidInviteExplanation,
    styles.invalidInviteTitle,
    styles.invitation,
    linkStatus,
  ]);

  const buttons = React.useMemo(() => {
    if (linkStatus === 'valid') {
      const joinButtonContent =
        joinThreadLoadingStatus === 'loading' ? (
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
            onPress={joinCommunity}
            disabled={joinThreadLoadingStatus === 'loading'}
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
        onPress={props.navigation.goBack}
      >
        <Text style={styles.buttonText}>Return to Comm</Text>
      </Button>
    );
  }, [
    linkStatus,
    joinCommunity,
    joinThreadLoadingStatus,
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
  communityName: {
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
