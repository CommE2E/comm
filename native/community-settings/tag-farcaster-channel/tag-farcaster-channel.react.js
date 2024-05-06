// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text, Platform } from 'react-native';
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
import {
  TagFarcasterChannelByNameRouteName,
  type NavigationRoute,
} from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';

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

  const fid = useCurrentUserFID();
  invariant(fid, 'FID should be set');

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
      if (selectedIndex === channelOptions.length) {
        navigate<'TagFarcasterChannelByName'>({
          name: TagFarcasterChannelByNameRouteName,
          params: { communityID },
        });

        return;
      }

      const channel = channelOptions[selectedIndex];

      void dispatchActionPromise(
        createOrUpdateFarcasterChannelTagActionTypes,
        createCreateOrUpdateActionPromise(channel.id),
      );
    },
    [
      channelOptions,
      communityID,
      createCreateOrUpdateActionPromise,
      dispatchActionPromise,
      navigate,
    ],
  );

  const onPressTag = React.useCallback(() => {
    const channelNames = [
      ...channelOptions.map(channel => `/${channel.id}`),
      'Other',
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
          <RegistrationButton
            onPress={onPressTag}
            label="Tag channel"
            variant="enabled"
          />
        </View>
        <View style={styles.errorContainer}>{errorMessage}</View>
      </View>
    ),
    [
      styles.panelSectionContainer,
      styles.sectionText,
      styles.sectionHeaderText,
      styles.errorContainer,
      onPressTag,
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
