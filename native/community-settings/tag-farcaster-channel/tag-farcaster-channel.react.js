// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createOrUpdateFarcasterChannelTagActionTypes,
  useCreateOrUpdateFarcasterChannelTag,
} from 'lib/actions/community-actions.js';
import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import type { NeynarChannel } from 'lib/types/farcaster-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import { tagFarcasterChannelErrorMessages } from './tag-farcaster-channel-utils.js';
import RegistrationButton from '../../account/registration/registration-button.react.js';
import SWMansionIcon from '../../components/swmansion-icon.react.js';
import {
  TagFarcasterChannelByNameRouteName,
  type NavigationRoute,
} from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles, useColors } from '../../themes/colors.js';

export type TagFarcasterChannelParams = {
  +communityID: string,
};

type Props = {
  +navigation: TagFarcasterChannelNavigationProp<'TagFarcasterChannel'>,
  +route: NavigationRoute<'TagFarcasterChannel'>,
};

function TagFarcasterChannel(props: Props): React.Node {
  const { navigation, route } = props;

  const { navigate } = navigation;
  const { communityID } = route.params;

  const styles = useStyles(unboundStyles);

  const colors = useColors();

  const fid = useCurrentUserFID();
  invariant(fid, 'FID should be set');

  const [selectedChannel, setSelectedChannel] =
    React.useState<?NeynarChannel>(null);

  const [channelOptions, setChannelOptions] = React.useState<
    $ReadOnlyArray<NeynarChannel>,
  >([]);

  const [error, setError] = React.useState<?string>(null);

  const neynarClientContext = React.useContext(NeynarClientContext);
  invariant(neynarClientContext, 'NeynarClientContext is missing');

  const { client } = neynarClientContext;

  React.useEffect(() => {
    void (async () => {
      const channels = await client.fetchFollowedFarcasterChannels(fid);

      setChannelOptions(channels);
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

      setError(null);
      setSelectedChannel(channelOptions[selectedIndex]);
    },
    [channelOptions],
  );

  const onPressSelectChannel = React.useCallback(() => {
    const channelNames = channelOptions.map(channel => channel.name);

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

  const dispatchActionPromise = useDispatchActionPromise();

  const createOrUpdateFarcasterChannelTag =
    useCreateOrUpdateFarcasterChannelTag();

  const createCreateOrUpdateActionPromise = React.useCallback(async () => {
    if (!selectedChannel) {
      return undefined;
    }

    try {
      return await createOrUpdateFarcasterChannelTag({
        commCommunityID: communityID,
        farcasterChannelID: selectedChannel.id,
      });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [communityID, createOrUpdateFarcasterChannelTag, selectedChannel]);

  const onPressTag = React.useCallback(() => {
    void dispatchActionPromise(
      createOrUpdateFarcasterChannelTagActionTypes,
      createCreateOrUpdateActionPromise(),
    );
  }, [createCreateOrUpdateActionPromise, dispatchActionPromise]);

  const errorMessage = React.useMemo(() => {
    if (!error) {
      return null;
    }

    return (
      <Text style={styles.error}>
        {tagFarcasterChannelErrorMessages[error] ?? 'Unknown error.'}
      </Text>
    );
  }, [error, styles.error]);

  const channelSelectionTextContent = selectedChannel?.name
    ? selectedChannel.name
    : 'No Farcaster channel tagged';

  const buttonVariant = selectedChannel ? 'enabled' : 'disabled';

  const onPressTagChannelByName = React.useCallback(() => {
    navigate<'TagFarcasterChannelByName'>({
      name: TagFarcasterChannelByNameRouteName,
      params: { communityID },
    });
  }, [communityID, navigate]);

  const tagFarcasterChannel = React.useMemo(
    () => (
      <View>
        <View style={styles.panelSectionContainer}>
          <Text style={styles.sectionText}>
            Tag a Farcaster channel so followers can find your Comm community!
          </Text>
        </View>
        <Text style={styles.sectionHeaderText}>FARCASTER CHANNEL</Text>
        <View style={styles.panelSectionContainer}>
          <View style={styles.channelSelectionContainer}>
            <Text style={styles.sectionText}>
              {channelSelectionTextContent}
            </Text>
            <TouchableOpacity
              onPress={onPressSelectChannel}
              style={styles.editButtonContainer}
            >
              <SWMansionIcon
                name="edit-1"
                size={20}
                color={colors.panelForegroundSecondaryLabel}
              />
            </TouchableOpacity>
          </View>
          <RegistrationButton
            onPress={onPressTag}
            label="Tag channel"
            variant={buttonVariant}
          />
          <View style={styles.tagChannelByNameLinkContainer}>
            <Text style={styles.sectionText}>Can’t find a channel? </Text>
            <TouchableOpacity onPress={onPressTagChannelByName}>
              <Text style={styles.tagChannelByNameLink}>
                Tag channel by name
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.errorContainer}>{errorMessage}</View>
      </View>
    ),
    [
      styles.panelSectionContainer,
      styles.sectionText,
      styles.sectionHeaderText,
      styles.channelSelectionContainer,
      styles.editButtonContainer,
      styles.tagChannelByNameLinkContainer,
      styles.tagChannelByNameLink,
      styles.errorContainer,
      channelSelectionTextContent,
      onPressSelectChannel,
      colors.panelForegroundSecondaryLabel,
      onPressTag,
      buttonVariant,
      onPressTagChannelByName,
      errorMessage,
    ],
  );

  return tagFarcasterChannel;
}

const unboundStyles = {
  panelSectionContainer: {
    backgroundColor: 'panelForeground',
    padding: 16,
    borderBottomColor: 'panelSeparator',
    borderBottomWidth: 1,
    borderTopColor: 'panelSeparator',
    borderTopWidth: 1,
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
    marginTop: 24,
  },
  channelSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editButtonContainer: {
    paddingLeft: 16,
  },
  tagChannelByNameLinkContainer: {
    flexDirection: 'row',
    marginTop: 24,
  },
  tagChannelByNameLink: {
    color: 'purpleLink',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    height: 18,
  },
  error: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    color: 'redText',
  },
};

export default TagFarcasterChannel;
