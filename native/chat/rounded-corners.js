// @flow

import type { Corners } from 'lib/types/media-types';

import type { ChatMessageInfoItemWithHeight } from './message.react';

function filterCorners(corners: Corners, item: ChatMessageInfoItemWithHeight) {
  const { startsCluster, endsCluster } = item;
  const { isViewer } = item.messageInfo.creator;
  const { topLeft, topRight, bottomLeft, bottomRight } = corners;
  return {
    topLeft: topLeft && (isViewer || startsCluster),
    topRight: topRight && (!isViewer || startsCluster),
    bottomLeft: bottomLeft && (isViewer || endsCluster),
    bottomRight: bottomRight && (!isViewer || endsCluster),
  };
}

const allCorners = {
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
};

function getRoundedContainerStyle(corners: Corners, borderRadius?: number = 8) {
  const { topLeft, topRight, bottomLeft, bottomRight } = corners;
  return {
    borderTopLeftRadius: topLeft ? borderRadius : 0,
    borderTopRightRadius: topRight ? borderRadius : 0,
    borderBottomLeftRadius: bottomLeft ? borderRadius : 0,
    borderBottomRightRadius: bottomRight ? borderRadius : 0,
  };
}

export { allCorners, filterCorners, getRoundedContainerStyle };
