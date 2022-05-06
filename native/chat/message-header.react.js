// @flow

import * as React from 'react';
import { View } from 'react-native';

import { stringForUser } from 'lib/shared/user-utils';

import { SingleLine } from '../components/single-line.react';
import { useStyles } from '../themes/colors';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types';
import { clusterEndHeight } from './composed-message-constants';
import type { DisplayType } from './timestamp.react';
import { Timestamp, timestampHeight } from './timestamp.react';

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

  let authorName = null;
  if (!isViewer && (modalDisplay || item.startsCluster)) {
    const style = [styles.authorName];
    if (modalDisplay) {
      style.push(styles.modal);
    }
    authorName = (
      <SingleLine style={style}>{stringForUser(creator)}</SingleLine>
    );
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
    marginLeft: 12,
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
