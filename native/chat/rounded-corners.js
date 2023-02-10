// @flow

import type { Corners } from 'lib/types/media-types.js';

import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

type FilteredCorners = {
  +bottomLeft: void | boolean,
  +bottomRight: void | boolean,
  +topLeft: void | boolean,
  +topRight: void | boolean,
};
function filterCorners(
  corners: Corners,
  item: ChatMessageInfoItemWithHeight,
): FilteredCorners {
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

const allCorners: FilteredCorners = {
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
};

type RoundedContainerStyle = {
  +borderBottomLeftRadius: number,
  +borderBottomRightRadius: number,
  +borderTopLeftRadius: number,
  +borderTopRightRadius: number,
};
function getRoundedContainerStyle(
  corners: Corners,
  borderRadius?: number = 8,
): RoundedContainerStyle {
  const { topLeft, topRight, bottomLeft, bottomRight } = corners;
  return {
    borderTopLeftRadius: topLeft ? borderRadius : 0,
    borderTopRightRadius: topRight ? borderRadius : 0,
    borderBottomLeftRadius: bottomLeft ? borderRadius : 0,
    borderBottomRightRadius: bottomRight ? borderRadius : 0,
  };
}

export { allCorners, filterCorners, getRoundedContainerStyle };
