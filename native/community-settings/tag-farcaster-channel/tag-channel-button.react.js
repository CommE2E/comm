// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { Text, View, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createOrUpdateFarcasterChannelTagActionTypes,
  useCreateOrUpdateFarcasterChannelTag,
} from 'lib/actions/community-actions.js';
import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { NeynarChannel } from 'lib/types/farcaster-types.js';
import type { SetState } from 'lib/types/hook-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import Button from '../../components/button.react.js';
import { TagFarcasterChannelByNameRouteName } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles, useColors } from '../../themes/colors.js';

const createOrUpdateFarcasterChannelTagStatusSelector =
  createLoadingStatusSelector(createOrUpdateFarcasterChannelTagActionTypes);

type Props = {
  +communityID: string,
  +isLoadingChannelInfo: boolean,
  +setError: SetState<?string>,
};

function TagChannelButton(props: Props): React.Node {
  const { communityID, isLoadingChannelInfo, setError } = props;

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
    [communityID, createOrUpdateFarcasterChannelTag, setError],
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
      setError,
    ],
  );

  const onPressTag = React.useCallback(() => {
    const channelNames = channelOptions.map(channel => channel.name);

    const options =
      Platform.OS === 'ios'
        ? [...channelNames, 'Other', 'Cancel']
        : channelNames;

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

  const createOrUpdateFarcasterChannelTagStatus = useSelector(
    createOrUpdateFarcasterChannelTagStatusSelector,
  );
  const isLoadingCreateOrUpdateFarcasterChannelTag =
    createOrUpdateFarcasterChannelTagStatus === 'loading' ||
    isLoadingChannelInfo;

  const buttonContent = React.useMemo(() => {
    if (isLoadingCreateOrUpdateFarcasterChannelTag) {
      return (
        <ActivityIndicator size="small" color={colors.panelForegroundLabel} />
      );
    }

    return <Text style={styles.buttonText}>Tag channel</Text>;
  }, [
    colors.panelForegroundLabel,
    isLoadingCreateOrUpdateFarcasterChannelTag,
    styles.buttonText,
  ]);

  return (
    <Button
      style={styles.button}
      disabled={isLoadingCreateOrUpdateFarcasterChannelTag}
      onPress={onPressTag}
    >
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
