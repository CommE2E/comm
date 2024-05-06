// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import RegistrationButton from '../../account/registration/registration-button.react.js';
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

// eslint-disable-next-line no-unused-vars
function TagFarcasterChannelByName(prop: Props): React.Node {
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
  buttonContainer: {
    marginTop: 16,
  },
};

export default TagFarcasterChannelByName;
