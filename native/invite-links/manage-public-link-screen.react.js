// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import {
  createOrUpdatePublicLink,
  createOrUpdatePublicLinkActionTypes,
} from 'lib/actions/link-actions.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import Button from '../components/button.react.js';
import TextInput from '../components/text-input.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

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
  const [name, setName] = React.useState(
    inviteLink?.name ?? Math.random().toString(36).slice(-9),
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const callCreateOrUpdatePublicLink = useServerCall(createOrUpdatePublicLink);
  const createInviteLink = React.useCallback(() => {
    dispatchActionPromise(
      createOrUpdatePublicLinkActionTypes,
      callCreateOrUpdatePublicLink({
        name,
        communityID: community.id,
      }),
    );
  }, [callCreateOrUpdatePublicLink, community.id, dispatchActionPromise, name]);
  const createOrUpdatePublicLinkStatus = useSelector(
    createOrUpdatePublicLinkStatusSelector,
  );

  const styles = useStyles(unboundStyles);

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionText}>
          Let your community be more accessible with your own unique public
          link. By enabling a public link, you are allowing anyone who has your
          link to join your community.{'\n\n'}
          Editing your community’s public link allows other communities to claim
          your previous URL.
        </Text>
      </View>
      <Text style={styles.sectionTitle}>INVITE URL</Text>
      <View style={styles.section}>
        <View style={styles.inviteLink}>
          <Text style={styles.inviteLinkPrefix}>https://comm.app/invite/</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            editable={createOrUpdatePublicLinkStatus !== 'loading'}
          />
        </View>
        <Button
          style={[styles.button, styles.buttonPrimary]}
          onPress={createInviteLink}
          disabled={createOrUpdatePublicLinkStatus === 'loading'}
        >
          <Text style={styles.buttonText}>Save & enable public link</Text>
        </Button>
      </View>
    </View>
  );
}

const createOrUpdatePublicLinkStatusSelector = createLoadingStatusSelector(
  createOrUpdatePublicLinkActionTypes,
);

const unboundStyles = {
  sectionTitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: 'modalBackgroundLabel',
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginTop: 24,
  },
  section: {
    borderBottomColor: 'modalSeparator',
    borderBottomWidth: 1,
    borderTopColor: 'modalSeparator',
    borderTopWidth: 1,
    backgroundColor: 'modalForeground',
    padding: 16,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    color: 'modalBackgroundLabel',
  },
  inviteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  },
  buttonPrimary: {
    backgroundColor: 'purpleButton',
  },
  buttonText: {
    color: 'whiteText',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
  },
};

export default ManagePublicLinkScreen;
