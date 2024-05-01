// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import SubmitButton from '../../components/submit-button.react.js';
import TextInput from '../../components/text-input.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles, useColors } from '../../themes/colors.js';

export type TagUnfollowedFarcasterChannelParams = {
  +communityID: string,
};

type Props = {
  +navigation: TagFarcasterChannelNavigationProp<'TagUnfollowedFarcasterChannel'>,
  +route: NavigationRoute<'TagUnfollowedFarcasterChannel'>,
};

// eslint-disable-next-line no-unused-vars
function TagUnfollowedFarcasterChannel(prop: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const [channelSelectionText, setChannelSelectionText] =
    React.useState<string>('');

  const onPressTagChannel = React.useCallback(async () => {
    // TODO
  }, []);

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
        <View style={styles.buttonContainer}>
          <SubmitButton
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
    backgroundColor: 'panelInputBackground',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  input: {
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
};

export default TagUnfollowedFarcasterChannel;
