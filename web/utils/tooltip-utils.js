// @flow

import invariant from 'invariant';
import * as React from 'react';

import { getAppContainerPositionInfo } from './window-utils.js';
import {
  tooltipButtonStyle,
  tooltipLabelStyle,
  tooltipStyle,
  reactionTooltipStyle,
  reactionSeeMoreLabel,
} from '../chat/chat-constants.js';
import type { PositionInfo } from '../chat/position-types.js';
import { calculateMaxTextWidth } from '../utils/text-utils.js';

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

export type TooltipSize = {
  +height: number,
  +width: number,
};

export type TooltipPositionStyle = {
  +anchorPoint: {
    +x: number,
    +y: number,
  },
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

function getTooltipScreenOverflowXCorrection(
  xAnchor: number,
  tooltipWidth: number,
): number {
  const appContainerPositionInfo = getAppContainerPositionInfo();
  if (!appContainerPositionInfo) {
    return 0;
  }

  const { right: containerRight } = appContainerPositionInfo;
  const padding = 16;

  const tooltipScreenOverflowX = xAnchor + tooltipWidth - containerRight;
  const correction =
    tooltipScreenOverflowX > 0 ? -tooltipScreenOverflowX - padding : 0;

  return correction;
}

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
  const appContainerPositionInfo = getAppContainerPositionInfo();

  if (!appContainerPositionInfo) {
    return defaultPosition;
  }

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

type GetTooltipStyleParams = {
  +sourcePositionInfo: PositionInfo,
  +tooltipSize: TooltipSize,
  +tooltipPosition: TooltipPosition,
};

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function getTooltipStyle({
  sourcePositionInfo,
  tooltipSize,
  tooltipPosition,
}: GetTooltipStyleParams): TooltipPositionStyle {
  if (tooltipPosition === tooltipPositions.RIGHT_TOP) {
    return {
      anchorPoint: {
        x: sourcePositionInfo.right,
        y: sourcePositionInfo.top,
      },
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      alignment: 'left',
    };
  } else if (tooltipPosition === tooltipPositions.LEFT_TOP) {
    return {
      anchorPoint: {
        x: sourcePositionInfo.left,
        y: sourcePositionInfo.top,
      },
      horizontalPosition: 'left',
      verticalPosition: 'bottom',
      alignment: 'right',
    };
  } else if (tooltipPosition === tooltipPositions.RIGHT_BOTTOM) {
    return {
      anchorPoint: {
        x: sourcePositionInfo.right,
        y: sourcePositionInfo.bottom,
      },
      horizontalPosition: 'right',
      verticalPosition: 'top',
      alignment: 'left',
    };
  } else if (tooltipPosition === tooltipPositions.LEFT_BOTTOM) {
    return {
      anchorPoint: {
        x: sourcePositionInfo.left,
        y: sourcePositionInfo.bottom,
      },
      horizontalPosition: 'left',
      verticalPosition: 'top',
      alignment: 'right',
    };
  } else if (tooltipPosition === tooltipPositions.LEFT) {
    return {
      anchorPoint: {
        x: sourcePositionInfo.left,
        y:
          sourcePositionInfo.top +
          sourcePositionInfo.height / 2 -
          tooltipSize.height / 2,
      },
      horizontalPosition: 'left',
      verticalPosition: 'bottom',
      alignment: 'right',
    };
  } else if (tooltipPosition === tooltipPositions.RIGHT) {
    return {
      anchorPoint: {
        x: sourcePositionInfo.right,
        y:
          sourcePositionInfo.top +
          sourcePositionInfo.height / 2 -
          tooltipSize.height / 2,
      },
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      alignment: 'left',
    };
  } else if (tooltipPosition === tooltipPositions.TOP) {
    const xAnchor =
      sourcePositionInfo.left +
      sourcePositionInfo.width / 2 -
      tooltipSize.width / 2;

    const tooltipOverflowXCorrection = getTooltipScreenOverflowXCorrection(
      xAnchor,
      tooltipSize.width,
    );

    return {
      anchorPoint: {
        x: xAnchor + tooltipOverflowXCorrection,
        y: sourcePositionInfo.top,
      },
      horizontalPosition: 'right',
      verticalPosition: 'top',
      alignment: 'center',
    };
  } else if (tooltipPosition === tooltipPositions.BOTTOM) {
    const xAnchor =
      sourcePositionInfo.left +
      sourcePositionInfo.width / 2 -
      tooltipSize.width / 2;

    const tooltipOverflowXCorrection = getTooltipScreenOverflowXCorrection(
      xAnchor,
      tooltipSize.width,
    );

    return {
      anchorPoint: {
        x: xAnchor + tooltipOverflowXCorrection,
        y: sourcePositionInfo.bottom,
      },
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      alignment: 'center',
    };
  }
  invariant(false, `Unexpected tooltip position value: ${tooltipPosition}`);
}

type GetTooltipPositionStyleParams = {
  +tooltipSourcePosition: ?PositionInfo,
  +tooltipSize: TooltipSize,
  +availablePositions: $ReadOnlyArray<TooltipPosition>,
  +preventDisplayingBelowSource?: boolean,
};

function getTooltipPositionStyle(
  params: GetTooltipPositionStyleParams,
): ?TooltipPositionStyle {
  const {
    tooltipSourcePosition,
    tooltipSize,
    availablePositions,
    preventDisplayingBelowSource,
  } = params;
  if (!tooltipSourcePosition) {
    return undefined;
  }
  const tooltipPosition = findTooltipPosition({
    sourcePositionInfo: tooltipSourcePosition,
    tooltipSize,
    availablePositions,
    defaultPosition: availablePositions[0],
    preventDisplayingBelowSource,
  });
  if (!tooltipPosition) {
    return undefined;
  }

  const tooltipPositionStyle = getTooltipStyle({
    tooltipPosition,
    sourcePositionInfo: tooltipSourcePosition,
    tooltipSize,
  });

  return tooltipPositionStyle;
}

type CalculateMessageTooltipSizeArgs = {
  +tooltipLabels: $ReadOnlyArray<string>,
  +timestamp: string,
};

function calculateMessageTooltipSize({
  tooltipLabels,
  timestamp,
}: CalculateMessageTooltipSizeArgs): TooltipSize {
  const textWidth =
    calculateMaxTextWidth([...tooltipLabels, timestamp], 14) +
    2 * tooltipLabelStyle.padding;
  const buttonsWidth =
    tooltipLabels.length *
    (tooltipButtonStyle.width +
      tooltipButtonStyle.paddingLeft +
      tooltipButtonStyle.paddingRight);
  const width =
    Math.max(textWidth, buttonsWidth) +
    tooltipStyle.paddingLeft +
    tooltipStyle.paddingRight;
  const height =
    (tooltipLabelStyle.height + 2 * tooltipLabelStyle.padding) * 2 +
    tooltipStyle.rowGap * 2 +
    tooltipButtonStyle.height;
  return {
    width,
    height,
  };
}

function calculateReactionTooltipSize(
  usernames: $ReadOnlyArray<string>,
): TooltipSize {
  const showMoreTextIsShown = usernames.length > 5;
  const maxTooltipContentWidth = reactionTooltipStyle.maxWidth;
  const maxTooltipContentHeight = reactionTooltipStyle.maxHeight;

  const usernamesTextWidth = calculateMaxTextWidth(usernames, 14);
  const seeMoreTextWidth = calculateMaxTextWidth([reactionSeeMoreLabel], 12);

  let textWidth = usernamesTextWidth;
  if (showMoreTextIsShown) {
    textWidth = Math.max(usernamesTextWidth, seeMoreTextWidth);
  }

  const width =
    Math.min(maxTooltipContentWidth, textWidth) +
    reactionTooltipStyle.paddingLeft +
    reactionTooltipStyle.paddingRight;

  let height =
    usernames.length * tooltipLabelStyle.height +
    (usernames.length - 1) * reactionTooltipStyle.rowGap;

  if (showMoreTextIsShown) {
    height = maxTooltipContentHeight;
  }

  height +=
    reactionTooltipStyle.paddingTop + reactionTooltipStyle.paddingBottom;

  return {
    width,
    height,
  };
}

export {
  findTooltipPosition,
  getTooltipPositionStyle,
  calculateMessageTooltipSize,
  calculateReactionTooltipSize,
};
