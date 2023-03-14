// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useStringForUser } from 'lib/hooks/ens-cache.js';

import { clusterEndHeight, avatarOffset } from './chat-constants.js';
import type { DisplayType } from './timestamp.react.js';
import { Timestamp, timestampHeight } from './timestamp.react.js';
import { SingleLine } from '../components/single-line.react.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

type Props = {
  +item: ChatMessageInfoItemWithHeight,
  +focused: boolean,
  +display: DisplayType,
};
function MessageHeader(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { item, focused, display } = props;
  const { creator, time } = item.messageInfo;
  const { isViewer } = creator;
  const modalDisplay = display === 'modal';

  const shouldShowUsername = !isViewer && (modalDisplay || item.startsCluster);
  const stringForUser = useStringForUser(shouldShowUsername ? creator : null);

  const shouldRenderAvatars = useShouldRenderAvatars();

  let authorName = null;
  if (stringForUser) {
    const style = [styles.authorName];
    if (modalDisplay) {
      style.push(styles.modal);
    }

    if (shouldRenderAvatars) {
      style.push({ marginLeft: 12 + avatarOffset });
    } else {
      style.push({ marginLeft: 12 });
    }

    authorName = <SingleLine style={style}>{stringForUser}</SingleLine>;
  }

  const timestamp =
    modalDisplay || item.startsConversation ? (
      <Timestamp time={time} display={display} />
    ) : null;

  let style = null;
  if (focused && !modalDisplay) {
    let topMargin = 0;
    if (!item.startsCluster && !item.messageInfo.creator.isViewer) {
      topMargin += authorNameHeight + clusterEndHeight;
    }
    if (!item.startsConversation) {
      topMargin += timestampHeight;
    }
    style = { marginTop: topMargin };
  }

  return (
    <View style={style}>
      {timestamp}
      {authorName}
    </View>
  );
}

const authorNameHeight = 25;

const unboundStyles = {
  authorName: {
    bottom: 0,
    color: 'listBackgroundSecondaryLabel',
    fontSize: 14,
    height: authorNameHeight,
    marginRight: 7,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  modal: {
    // high contrast framed against OverlayNavigator-dimmed background
    color: 'white',
  },
};

export { MessageHeader, authorNameHeight };
