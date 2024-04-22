// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react';
import SWMansionIcon from '../../components/swmansion-icon.react.js';
import { type NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles, useColors } from '../../themes/colors.js';

type Props = {
  +navigation: TagFarcasterChannelNavigationProp<'TagFarcasterChannel'>,
  +route: NavigationRoute<'TagFarcasterChannel'>,
};

// eslint-disable-next-line no-unused-vars
function TagFarcasterChannel(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const colors = useColors();

  const fid = useCurrentUserFID();
  invariant(fid, 'FID should be set');

  const [selectedChannel, setSelectedChannel] = React.useState<?string>(null);

  const [channelOptions, setChannelOptions] = React.useState<
    $ReadOnlyArray<string>,
  >([]);

  const neynarClientContext = React.useContext(NeynarClientContext);
  invariant(neynarClientContext, 'NeynarClientContext is missing');

  const { client } = neynarClientContext;

  React.useEffect(() => {
    void (async () => {
      const data = await client.fetchFollowedFarcasterChannels(fid);

      const result = data.map(channel => channel.name);

      setChannelOptions(result);
    })();
  }, [client, fid]);

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);

  const { showActionSheetWithOptions } = useActionSheet();

  const insets = useSafeAreaInsets();

  const onOptionSelected = React.useCallback(
    (selectedIndex: ?number) => {
      if (
        selectedIndex === undefined ||
        selectedIndex === null ||
        selectedIndex === channelOptions.length
      ) {
        return;
      }

      setSelectedChannel(channelOptions[selectedIndex]);
    },
    [channelOptions],
  );

  const onPressSelectChannel = React.useCallback(() => {
    const options =
      Platform.OS === 'ios' ? [...channelOptions, 'Cancel'] : channelOptions;

    const cancelButtonIndex = Platform.OS === 'ios' ? options.length - 1 : -1;

    const containerStyle = {
      paddingBottom: insets.bottom,
    };

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        containerStyle,
        userInterfaceStyle: activeTheme ?? 'dark',
      },
      onOptionSelected,
    );
  }, [
    activeTheme,
    channelOptions,
    insets.bottom,
    onOptionSelected,
    showActionSheetWithOptions,
  ]);

  const channelSelectionStyles = React.useMemo(
    () => [styles.sectionContainer, styles.touchableSectionContainer],
    [styles.sectionContainer, styles.touchableSectionContainer],
  );

  const channelSelectionTextContent = selectedChannel
    ? selectedChannel
    : 'No Farcaster channel tagged';

  const tagFarcasterChannel = React.useMemo(
    () => (
      <View>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionText}>
            Tag a Farcaster channel so followers can find your Comm community!
          </Text>
        </View>
        <Text style={styles.sectionHeaderText}>FARCASTER CHANNEL</Text>
        <TouchableOpacity
          style={channelSelectionStyles}
          onPress={onPressSelectChannel}
        >
          <Text style={styles.sectionText}>{channelSelectionTextContent}</Text>
          <SWMansionIcon
            name="edit-1"
            size={20}
            color={colors.panelForegroundSecondaryLabel}
          />
        </TouchableOpacity>
      </View>
    ),
    [
      styles.sectionContainer,
      styles.sectionText,
      styles.sectionHeaderText,
      channelSelectionStyles,
      onPressSelectChannel,
      channelSelectionTextContent,
      colors.panelForegroundSecondaryLabel,
    ],
  );

  return tagFarcasterChannel;
}

const unboundStyles = {
  sectionContainer: {
    backgroundColor: 'panelForeground',
    marginBottom: 24,
    padding: 16,
  },
  sectionText: {
    color: 'panelForegroundLabel',
    fontSize: 14,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: 'panelForegroundLabel',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  touchableSectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
};

export default TagFarcasterChannel;
