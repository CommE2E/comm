// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { Text, View, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import { useCreateFarcasterChannelTag } from 'lib/shared/community-utils.js';
import type { NeynarChannel } from 'lib/types/farcaster-types.js';
import type { SetState } from 'lib/types/hook-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import Button from '../../components/button.react.js';
import { TagFarcasterChannelByNameRouteName } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles, useColors } from '../../themes/colors.js';

type Props = {
  +communityID: string,
  +setError: SetState<?string>,
};

function TagChannelButton(props: Props): React.Node {
  const { communityID, setError } = props;

  const { navigate } = useNavigation();

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const fid = useCurrentUserFID();
  invariant(fid, 'FID should be set');

  const [channelOptions, setChannelOptions] = React.useState<
    $ReadOnlyArray<NeynarChannel>,
  >([]);

  const neynarClientContext = React.useContext(NeynarClientContext);
  invariant(neynarClientContext, 'NeynarClientContext is missing');

  const { fcCache } = neynarClientContext;

  React.useEffect(() => {
    void (async () => {
      const channels = await fcCache.getFollowedFarcasterChannelsForFID(fid);
      if (!channels) {
        return;
      }

      const sortedChannels = [...channels].sort((a, b) =>
        a.id.localeCompare(b.id),
      );

      setChannelOptions(sortedChannels);
    })();
  }, [fcCache, fid]);

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);

  const { showActionSheetWithOptions } = useActionSheet();

  const insets = useSafeAreaInsets();

  const { createTag, isLoading } = useCreateFarcasterChannelTag(
    communityID,
    setError,
  );

  const onOptionSelected = React.useCallback(
    (selectedIndex: ?number) => {
      if (
        selectedIndex === undefined ||
        selectedIndex === null ||
        selectedIndex > channelOptions.length
      ) {
        return;
      }

      setError(null);

      // This is the "Other" option
      if (selectedIndex === 0) {
        navigate<'TagFarcasterChannelByName'>({
          name: TagFarcasterChannelByNameRouteName,
          params: { communityID },
        });

        return;
      }

      const channel = channelOptions[selectedIndex - 1];

      createTag(channel.id);
    },
    [channelOptions, communityID, createTag, navigate, setError],
  );

  const onPressTag = React.useCallback(() => {
    const channelNames = [
      'Other',
      ...channelOptions.map(channel => `/${channel.id}`),
    ];

    const options =
      Platform.OS === 'ios' ? [...channelNames, 'Cancel'] : channelNames;

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

  const buttonContent = React.useMemo(() => {
    if (isLoading) {
      return (
        <ActivityIndicator size="small" color={colors.panelForegroundLabel} />
      );
    }

    return <Text style={styles.buttonText}>Tag channel</Text>;
  }, [colors.panelForegroundLabel, isLoading, styles.buttonText]);

  return (
    <Button style={styles.button} disabled={isLoading} onPress={onPressTag}>
      <View style={styles.buttonContainer}>{buttonContent}</View>
    </Button>
  );
}

const unboundStyles = {
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'purpleButton',
  },
  buttonText: {
    color: 'whiteText',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    height: 24,
  },
};

export default TagChannelButton;
