// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import {
  createOrUpdateFarcasterChannelTagActionTypes,
  useCreateOrUpdateFarcasterChannelTag,
} from 'lib/actions/community-actions.js';
import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import RegistrationButton from '../../account/registration/registration-button.react.js';
import TextInput from '../../components/text-input.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles, useColors } from '../../themes/colors.js';

const errorMessages: { +[string]: string } = {
  already_in_use: 'This Farcaster channel is already tagged to a community.',
  channel_not_found: 'Cannot find a channel with the provided name.',
};

export type TagFarcasterChannelByNameParams = {
  +communityID: string,
};

type Props = {
  +navigation: TagFarcasterChannelNavigationProp<'TagFarcasterChannelByName'>,
  +route: NavigationRoute<'TagFarcasterChannelByName'>,
};

function TagFarcasterChannelByName(prop: Props): React.Node {
  const { navigation, route } = prop;

  const { goBack } = navigation;
  const { communityID } = route.params;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const [channelSelectionText, setChannelSelectionText] =
    React.useState<string>('');
  const [error, setError] = React.useState<?string>(null);

  const neynarClientContext = React.useContext(NeynarClientContext);
  invariant(neynarClientContext, 'NeynarClientContext is missing');

  const dispatchActionPromise = useDispatchActionPromise();

  const createOrUpdateFarcasterChannelTag =
    useCreateOrUpdateFarcasterChannelTag();

  const createCreateOrUpdateActionPromise = React.useCallback(
    async (channelID: string) => {
      try {
        return await createOrUpdateFarcasterChannelTag({
          commCommunityID: communityID,
          farcasterChannelID: channelID,
        });
      } catch (e) {
        setError(e.message);
        throw e;
      }
    },
    [communityID, createOrUpdateFarcasterChannelTag],
  );

  const onPressTagChannel = React.useCallback(async () => {
    const channelInfo =
      await neynarClientContext.client.fetchFarcasterChannelByName(
        channelSelectionText,
      );

    if (!channelInfo) {
      setError('channel_not_found');
      return;
    }

    await dispatchActionPromise(
      createOrUpdateFarcasterChannelTagActionTypes,
      createCreateOrUpdateActionPromise(channelInfo.id),
    );

    goBack();
  }, [
    channelSelectionText,
    createCreateOrUpdateActionPromise,
    dispatchActionPromise,
    goBack,
    neynarClientContext.client,
  ]);

  const errorMessage = React.useMemo(() => {
    if (!error) {
      return null;
    }

    return (
      <Text style={styles.error}>
        {errorMessages[error] ?? 'Unknown error.'}
      </Text>
    );
  }, [error, styles.error]);

  const submitButtonVariant =
    channelSelectionText.length > 0 ? 'enabled' : 'disabled';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>CHANNEL NAME</Text>
      <View style={styles.panelSectionContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={channelSelectionText}
            onChangeText={setChannelSelectionText}
            placeholder="Channel name"
            placeholderTextColor={colors.panelForegroundTertiaryLabel}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        {errorMessage}
        <View style={styles.buttonContainer}>
          <RegistrationButton
            onPress={onPressTagChannel}
            label="Tag channel"
            variant={submitButtonVariant}
          />
        </View>
      </View>
    </View>
  );
}

const unboundStyles = {
  container: {
    paddingTop: 24,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  panelSectionContainer: {
    backgroundColor: 'panelForeground',
    padding: 16,
    borderBottomColor: 'panelSeparator',
    borderBottomWidth: 1,
    borderTopColor: 'panelSeparator',
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'panelSecondaryForegroundBorder',
    borderRadius: 8,
  },
  input: {
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    color: 'redText',
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 16,
  },
};

export default TagFarcasterChannelByName;
