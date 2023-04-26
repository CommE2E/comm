// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import {
  joinThread,
  joinThreadActionTypes,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { InviteLinkVerificationResponse } from 'lib/types/link-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

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
};

type Props = {
  +navigation: RootNavigationProp<'InviteLinkModal'>,
  +route: NavigationRoute<'InviteLinkModal'>,
};

function InviteLinkModal(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { invitationDetails, secret } = props.route.params;

  React.useEffect(() => {
    if (invitationDetails.status === 'already_joined') {
      props.navigation.goBack();
    }
  }, [invitationDetails.status, props.navigation]);

  const header = React.useMemo(() => {
    if (invitationDetails.status === 'valid') {
      return (
        <>
          <Text style={styles.invitation}>You have been invited to join</Text>
          <Text style={styles.communityName}>
            {invitationDetails.community.name}
          </Text>
        </>
      );
    }
    return (
      <>
        <Text style={styles.invalidInviteTitle}>Invite invalid</Text>
        <Text style={styles.invalidInviteExplanation}>
          This invite link may be expired, please try again with another invite
          link
        </Text>
      </>
    );
  }, [
    invitationDetails,
    styles.communityName,
    styles.invalidInviteExplanation,
    styles.invalidInviteTitle,
    styles.invitation,
  ]);

  const callJoinThread = useServerCall(joinThread);
  const navContext = React.useContext(NavContext);
  const calendarQuery = useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );
  const communityID = invitationDetails.community?.id;
  const createJoinCommunityAction = React.useCallback(async () => {
    invariant(
      communityID,
      'CommunityID should be present while calling this function',
    );
    const query = calendarQuery();
    const result = await callJoinThread({
      threadID: communityID,
      calendarQuery: {
        startDate: query.startDate,
        endDate: query.endDate,
        filters: [
          ...query.filters,
          { type: 'threads', threadIDs: [communityID] },
        ],
      },
      inviteLinkSecret: secret,
    });
    props.navigation.goBack();
    return result;
  }, [calendarQuery, callJoinThread, communityID, props.navigation, secret]);
  const dispatchActionPromise = useDispatchActionPromise();
  const joinCommunity = React.useCallback(() => {
    dispatchActionPromise(joinThreadActionTypes, createJoinCommunityAction());
  }, [createJoinCommunityAction, dispatchActionPromise]);
  const joinThreadLoadingStatus = useSelector(joinThreadLoadingStatusSelector);

  const buttons = React.useMemo(() => {
    if (invitationDetails.status === 'valid') {
      const joinButtonContent =
        joinThreadLoadingStatus === 'loading' ? (
          <ActivityIndicator
            size="small"
            color="white"
            style={styles.activityIndicatorStyle}
          />
        ) : (
          <Text style={styles.buttonText}>Accept Invite</Text>
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
    invitationDetails.status,
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

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);

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
