// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import type { CommunityInfo } from 'lib/types/community-types.js';
import type { NeynarChannel } from 'lib/types/farcaster-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import TagChannelButton from './tag-channel-button.react.js';
import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import { tagFarcasterChannelErrorMessages } from './tag-farcaster-channel-utils.js';
import { type NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';

export type TagFarcasterChannelParams = {
  +communityID: string,
  +farcasterChannel: ?NeynarChannel,
};

type Props = {
  +navigation: TagFarcasterChannelNavigationProp<'TagFarcasterChannel'>,
  +route: NavigationRoute<'TagFarcasterChannel'>,
};

function TagFarcasterChannel(props: Props): React.Node {
  const { route } = props;

  const { communityID, farcasterChannel } = route.params;

  const fid = useCurrentUserFID();
  invariant(fid, 'FID should be set');

  const neynarClientContext = React.useContext(NeynarClientContext);
  invariant(neynarClientContext, 'NeynarClientContext is missing');

  const { client } = neynarClientContext;

  const communityInfo: ?CommunityInfo = useSelector(
    state => state.communityStore.communityInfos[communityID],
  );

  const [selectedChannel, setSelectedChannel] =
    React.useState<?NeynarChannel>(farcasterChannel);

  const [isLoadingChannelInfo, setIsLoadingChannelInfo] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      setIsLoadingChannelInfo(true);

      if (!communityInfo?.farcasterChannelID) {
        setSelectedChannel(null);
        setIsLoadingChannelInfo(false);
        return;
      }

      const channel = await client.fetchFarcasterChannelInfo(
        communityInfo.farcasterChannelID,
        fid,
      );

      setSelectedChannel(channel);
      setIsLoadingChannelInfo(false);
    })();
  }, [client, communityInfo?.farcasterChannelID, fid]);

  const styles = useStyles(unboundStyles);

  const [error, setError] = React.useState<?string>(null);

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

  const channelNameTextContent = selectedChannel?.name
    ? selectedChannel.name
    : 'No Farcaster channel tagged';

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
          <Text style={styles.sectionText}>Selected channel:</Text>
          <Text style={styles.channelNameText}>{channelNameTextContent}</Text>
          <TagChannelButton
            communityID={communityID}
            isLoadingChannelInfo={isLoadingChannelInfo}
            setError={setError}
          />
        </View>
        <View style={styles.errorContainer}>{errorMessage}</View>
      </View>
    ),
    [
      styles.panelSectionContainer,
      styles.sectionText,
      styles.sectionHeaderText,
      styles.channelNameText,
      styles.errorContainer,
      channelNameTextContent,
      communityID,
      isLoadingChannelInfo,
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
  channelNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'panelForegroundLabel',
    marginTop: 8,
    marginBottom: 24,
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
