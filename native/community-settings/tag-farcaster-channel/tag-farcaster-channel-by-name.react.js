// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import {
  tagFarcasterChannelErrorMessages,
  useCreateFarcasterChannelTag,
} from 'lib/shared/community-utils.js';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import TextInput from '../../components/text-input.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles, useColors } from '../../themes/colors.js';

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

  const { createTag, isLoading } = useCreateFarcasterChannelTag(
    communityID,
    setError,
    goBack,
  );

  const onPressTagChannel = React.useCallback(async () => {
    const channelInfo =
      await neynarClientContext.fcCache.getFarcasterChannelForChannelID(
        channelSelectionText,
      );

    if (!channelInfo) {
      setError('channel_not_found');
      return;
    }

    createTag(channelInfo.id);
  }, [channelSelectionText, createTag, neynarClientContext.fcCache]);

  const errorMessage = React.useMemo(() => {
    if (!error) {
      return <View style={styles.errorPlaceholder} />;
    }

    return (
      <Text style={styles.error}>
        {tagFarcasterChannelErrorMessages[error] ?? 'Unknown error.'}
      </Text>
    );
  }, [error, styles.error, styles.errorPlaceholder]);

  let submitButtonVariant = 'disabled';
  if (isLoading) {
    submitButtonVariant = 'loading';
  } else if (channelSelectionText.length > 0) {
    submitButtonVariant = 'enabled';
  }

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
        <PrimaryButton
          onPress={onPressTagChannel}
          label="Tag channel"
          variant={submitButtonVariant}
        />
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
    marginBottom: 8,
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
  },
  errorPlaceholder: {
    height: 18,
  },
};

export default TagFarcasterChannelByName;
