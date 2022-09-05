// @flow

import * as React from 'react';

import type { PositionInfo } from './position-types';

export const tooltipPositions = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
  LEFT_BOTTOM: 'left-bottom',
  RIGHT_BOTTOM: 'right-bottom',
  LEFT_TOP: 'left-top',
  RIGHT_TOP: 'right-top',
  TOP: 'top',
  BOTTOM: 'bottom',
});

type TooltipSize = {
  +height: number,
  +width: number,
};

export type TooltipPositionStyle = {
  +xCoord: number,
  +yCoord: number,
  +verticalPosition: 'top' | 'bottom',
  +horizontalPosition: 'left' | 'right',
  +alignment: 'left' | 'center' | 'right',
};

export type TooltipPosition = $Values<typeof tooltipPositions>;

export type MessageTooltipAction = {
  +label: string,
  +onClick: (SyntheticEvent<HTMLDivElement>) => mixed,
  +actionButtonContent: React.Node,
};

const sizeOfTooltipArrow = 10; // 7px arrow + 3px extra
const appTopBarHeight = 65;

// eslint-disable-next-line no-unused-vars
const font =
  '14px -apple-system, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", ' +
  '"Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", ui-sans-serif';

type FindTooltipPositionArgs = {
  +sourcePositionInfo: PositionInfo,
  +tooltipSize: TooltipSize,
  +availablePositions: $ReadOnlyArray<TooltipPosition>,
  +defaultPosition: TooltipPosition,
  +preventDisplayingBelowSource?: boolean,
};

function findTooltipPosition({
  sourcePositionInfo,
  tooltipSize,
  availablePositions,
  defaultPosition,
  preventDisplayingBelowSource,
}: FindTooltipPositionArgs): TooltipPosition {
  if (!window) {
    return defaultPosition;
  }
  const appContainerPositionInfo: PositionInfo = {
    height: window.innerHeight - appTopBarHeight,
    width: window.innerWidth,
    top: appTopBarHeight,
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth,
  };

  const pointingTo = sourcePositionInfo;
  const {
    top: containerTop,
    left: containerLeft,
    right: containerRight,
    bottom: containerBottom,
  } = appContainerPositionInfo;

  const tooltipWidth = tooltipSize.width;
  const tooltipHeight = tooltipSize.height;

  const canBeDisplayedOnLeft = containerLeft + tooltipWidth <= pointingTo.left;
  const canBeDisplayedOnRight =
    tooltipWidth + pointingTo.right <= containerRight;

  const willCoverSidebarOnTopSideways =
    preventDisplayingBelowSource &&
    pointingTo.top + tooltipHeight > pointingTo.bottom;

  const canBeDisplayedOnTopSideways =
    pointingTo.top >= containerTop &&
    pointingTo.top + tooltipHeight <= containerBottom &&
    !willCoverSidebarOnTopSideways;

  const canBeDisplayedOnBottomSideways =
    pointingTo.bottom <= containerBottom &&
    pointingTo.bottom - tooltipHeight >= containerTop;

  const verticalCenterOfPointingTo = pointingTo.top + pointingTo.height / 2;
  const horizontalCenterOfPointingTo = pointingTo.left + pointingTo.width / 2;

  const willCoverSidebarInTheMiddleSideways =
    preventDisplayingBelowSource &&
    verticalCenterOfPointingTo + tooltipHeight / 2 > pointingTo.bottom;

  const canBeDisplayedInTheMiddleSideways =
    verticalCenterOfPointingTo - tooltipHeight / 2 >= containerTop &&
    verticalCenterOfPointingTo + tooltipHeight / 2 <= containerBottom &&
    !willCoverSidebarInTheMiddleSideways;

  const canBeDisplayedOnTop =
    pointingTo.top - tooltipHeight >= containerTop &&
    horizontalCenterOfPointingTo - tooltipWidth / 2 >= containerLeft &&
    horizontalCenterOfPointingTo + tooltipWidth / 2 <= containerRight;

  const canBeDisplayedOnBottom =
    pointingTo.bottom + tooltipHeight <= containerBottom &&
    horizontalCenterOfPointingTo - tooltipWidth / 2 >= containerLeft &&
    horizontalCenterOfPointingTo + tooltipWidth / 2 <= containerRight &&
    !preventDisplayingBelowSource;

  for (const tooltipPosition of availablePositions) {
    if (
      tooltipPosition === tooltipPositions.RIGHT &&
      canBeDisplayedOnRight &&
      canBeDisplayedInTheMiddleSideways
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.RIGHT_BOTTOM &&
      canBeDisplayedOnRight &&
      canBeDisplayedOnBottomSideways
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.LEFT &&
      canBeDisplayedOnLeft &&
      canBeDisplayedInTheMiddleSideways
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.LEFT_BOTTOM &&
      canBeDisplayedOnLeft &&
      canBeDisplayedOnBottomSideways
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.LEFT_TOP &&
      canBeDisplayedOnLeft &&
      canBeDisplayedOnTopSideways
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.RIGHT_TOP &&
      canBeDisplayedOnRight &&
      canBeDisplayedOnTopSideways
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.TOP &&
      canBeDisplayedOnTop
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.BOTTOM &&
      canBeDisplayedOnBottom
    ) {
      return tooltipPosition;
    }
  }
  return defaultPosition;
}

export { findTooltipPosition, sizeOfTooltipArrow };
