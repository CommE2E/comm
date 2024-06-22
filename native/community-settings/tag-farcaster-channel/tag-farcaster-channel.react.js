// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { tagFarcasterChannelErrorMessages } from 'lib/shared/community-utils.js';
import type { CommunityInfo } from 'lib/types/community-types.js';

import RemoveTagButton from './remove-tag-button.react.js';
import TagChannelButton from './tag-channel-button.react.js';
import type { TagFarcasterChannelNavigationProp } from './tag-farcaster-channel-navigator.react.js';
import { type NavigationRoute } from '../../navigation/route-names.js';
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
  const { route } = props;

  const { communityID } = route.params;

  const communityInfo: ?CommunityInfo = useSelector(
    state => state.communityStore.communityInfos[communityID],
  );

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

  const channelNameTextContent = React.useMemo(() => {
    if (!communityInfo?.farcasterChannelID) {
      return (
        <Text style={styles.noChannelText}>No Farcaster channel tagged</Text>
      );
    }

    return (
      <Text style={styles.channelNameText}>
        {`/${communityInfo.farcasterChannelID}`}
      </Text>
    );
  }, [
    communityInfo?.farcasterChannelID,
    styles.channelNameText,
    styles.noChannelText,
  ]);

  const sectionButton = React.useMemo(
    () =>
      communityInfo?.farcasterChannelID ? (
        <RemoveTagButton
          channelID={communityInfo.farcasterChannelID}
          communityID={communityID}
          setError={setError}
        />
      ) : (
        <TagChannelButton communityID={communityID} setError={setError} />
      ),
    [communityID, communityInfo?.farcasterChannelID],
  );

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
          <View style={styles.channelNameContainer}>
            {channelNameTextContent}
          </View>
          {sectionButton}
        </View>
        <View style={styles.errorContainer}>{errorMessage}</View>
      </View>
    ),
    [
      styles.panelSectionContainer,
      styles.sectionText,
      styles.sectionHeaderText,
      styles.channelNameContainer,
      styles.errorContainer,
      channelNameTextContent,
      sectionButton,
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
  channelNameContainer: {
    marginTop: 8,
    marginBottom: 24,
    height: 20,
  },
  channelNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'panelForegroundLabel',
  },
  noChannelText: {
    fontSize: 16,
    color: 'panelForegroundLabel',
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
