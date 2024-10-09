// @flow

import { useRoute } from '@react-navigation/native';
import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useStringForUser } from 'lib/hooks/ens-cache.js';

import { clusterEndHeight, avatarOffset } from './chat-constants.js';
import type { DisplayType } from './timestamp.react.js';
import { Timestamp, timestampHeight } from './timestamp.react.js';
import SingleLine from '../components/single-line.react.js';
import { MessageListRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import type { ChatComposedMessageInfoItemWithHeight } from '../types/chat-types.js';
import { useNavigateToUserProfileBottomSheet } from '../user-profile/user-profile-utils.js';

type Props = {
  +item: ChatComposedMessageInfoItemWithHeight,
  +focused: boolean,
  +display: DisplayType,
};
function MessageHeader(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { item, focused, display } = props;
  const { creator } = item.messageInfo;
  const { isViewer } = creator;

  const route = useRoute();
  const modalDisplay = display === 'modal';

  const shouldShowUsername = !isViewer && (modalDisplay || item.startsCluster);
  const stringForUser = useStringForUser(shouldShowUsername ? creator : null);

  const navigateToUserProfileBottomSheet =
    useNavigateToUserProfileBottomSheet();

  const onPressAuthorName = React.useCallback(
    () => navigateToUserProfileBottomSheet(item.messageInfo.creator.id),
    [item.messageInfo.creator.id, navigateToUserProfileBottomSheet],
  );

  const authorNameStyle = React.useMemo(() => {
    const style = [styles.authorName];
    if (modalDisplay) {
      style.push(styles.modal);
    }

    return style;
  }, [modalDisplay, styles.authorName, styles.modal]);

  const authorName = React.useMemo(() => {
    if (!stringForUser) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.authorNameContainer}
        onPress={onPressAuthorName}
      >
        <SingleLine style={authorNameStyle}>{stringForUser}</SingleLine>
      </TouchableOpacity>
    );
  }, [
    authorNameStyle,
    onPressAuthorName,
    stringForUser,
    styles.authorNameContainer,
  ]);

  // We only want to render the top-placed timestamp for a message if it's
  // rendered in the message list, and not any separate screens (i.e.
  // the PinnedMessagesScreen).
  const presentedFromMessageList =
    typeof route.params?.presentedFrom === 'string' &&
    route.params.presentedFrom.startsWith(MessageListRouteName);

  const messageInMessageList =
    route.name === MessageListRouteName || presentedFromMessageList;

  const timestamp = React.useMemo(() => {
    if (!messageInMessageList || (!modalDisplay && !item.startsConversation)) {
      return null;
    }

    return <Timestamp item={item} display={display} />;
  }, [display, item, messageInMessageList, modalDisplay]);

  const containerStyle = React.useMemo(() => {
    if (!focused || modalDisplay) {
      return null;
    }

    let topMargin = 0;
    if (!item.startsCluster && !item.messageInfo.creator.isViewer) {
      topMargin += authorNameHeight + clusterEndHeight;
    }
    if (!item.startsConversation) {
      topMargin += timestampHeight;
    }

    return { marginTop: topMargin };
  }, [
    focused,
    item.messageInfo.creator.isViewer,
    item.startsCluster,
    item.startsConversation,
    modalDisplay,
  ]);

  return (
    <View style={containerStyle}>
      {timestamp}
      {authorName}
    </View>
  );
}

const authorNameHeight = 25;

const unboundStyles = {
  authorNameContainer: {
    bottom: 0,
    marginRight: 7,
    marginLeft: 12 + avatarOffset,
    alignSelf: 'baseline',
  },
  authorName: {
    color: 'listBackgroundSecondaryLabel',
    fontSize: 14,
    height: authorNameHeight,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  modal: {
    // high contrast framed against OverlayNavigator-dimmed background
    color: 'white',
  },
};

export { MessageHeader, authorNameHeight };
