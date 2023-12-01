// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { inviteLinkURL } from 'lib/facts/links.js';
import { useInviteLinksActions } from 'lib/hooks/invite-links.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import {
  defaultErrorMessage,
  inviteLinkErrorMessages,
} from 'lib/shared/invite-links.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import Button from '../components/button.react.js';
import TextInput from '../components/text-input.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

export type ManagePublicLinkScreenParams = {
  +community: ThreadInfo,
};

type Props = {
  +navigation: RootNavigationProp<'ManagePublicLink'>,
  +route: NavigationRoute<'ManagePublicLink'>,
};

function ManagePublicLinkScreen(props: Props): React.Node {
  const { community } = props.route.params;
  const inviteLink = useSelector(primaryInviteLinksSelector)[community.id];
  const {
    error,
    isLoading,
    name,
    setName,
    createOrUpdateInviteLink,
    disableInviteLink,
  } = useInviteLinksActions(community.id, inviteLink);

  const styles = useStyles(unboundStyles);

  let errorComponent = null;
  if (error) {
    errorComponent = (
      <Text style={styles.error}>
        {inviteLinkErrorMessages[error] ?? defaultErrorMessage}
      </Text>
    );
  }

  const onDisableButtonClick = React.useCallback(() => {
    Alert.alert(
      'Disable public link',
      'Are you sure you want to disable your public link?\n' +
        '\n' +
        'Other communities will be able to claim the same URL.',
      [
        {
          text: 'Confirm disable',
          style: 'destructive',
          onPress: disableInviteLink,
        },
        {
          text: 'Cancel',
        },
      ],
      {
        cancelable: true,
      },
    );
  }, [disableInviteLink]);
  let disablePublicLinkSection = null;
  if (inviteLink) {
    disablePublicLinkSection = (
      <View style={[styles.section, styles.disableLinkSection]}>
        <Text style={styles.sectionText}>
          You may also disable the community public link.
        </Text>
        <Button
          style={[styles.button, styles.destructiveButton]}
          onPress={onDisableButtonClick}
          disabled={isLoading}
        >
          <Text style={styles.destructiveButtonText}>Disable</Text>
        </Button>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.section}>
        <Text style={[styles.sectionText, styles.withMargin]}>
          Invite links make it easy for your friends to join your community.
          Anybody who knows your community’s invite link will be able to join
          it.
        </Text>
        <Text style={styles.sectionText}>
          Note that if you change your public link’s URL, other communities will
          be able to claim the old URL.
        </Text>
      </View>
      <Text style={styles.sectionTitle}>INVITE URL</Text>
      <View style={styles.section}>
        <View style={styles.inviteLink}>
          <Text style={styles.inviteLinkPrefix}>{inviteLinkURL('')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            editable={!isLoading}
          />
        </View>
        {errorComponent}
        <Button
          style={[styles.button, styles.buttonPrimary]}
          onPress={createOrUpdateInviteLink}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Save & enable public link</Text>
        </Button>
      </View>
      {disablePublicLinkSection}
    </View>
  );
}

const unboundStyles = {
  sectionTitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
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
    marginBottom: 24,
  },
  disableLinkSection: {
    marginTop: 16,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    color: 'modalBackgroundLabel',
  },
  withMargin: {
    marginBottom: 12,
  },
  inviteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inviteLinkPrefix: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    color: 'disabledButtonText',
    marginRight: 2,
  },
  input: {
    color: 'panelForegroundLabel',
    borderColor: 'panelSecondaryForegroundBorder',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flex: 1,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  buttonPrimary: {
    backgroundColor: 'purpleButton',
  },
  destructiveButton: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'vibrantRedButton',
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: 'vibrantRedButton',
    textAlign: 'center',
  },
  buttonText: {
    color: 'whiteText',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
  },
  error: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    color: 'redText',
  },
};

export default ManagePublicLinkScreen;
