// @flow

import type { PositionInfo } from '../chat/position-types.js';

function getAppContainerPositionInfo(): ?PositionInfo {
  if (!window) {
    return null;
  }

  const appTopBarHeight = 65;

  return {
    height: window.innerHeight - appTopBarHeight,
    width: window.innerWidth,
    top: appTopBarHeight,
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth,
  };
}

export { getAppContainerPositionInfo };
