// @flow

import invariant from 'invariant';

import { calculateMaxTextWidth } from '../utils/text-utils';
import type { ItemAndContainerPositionInfo } from './position-types';

export const tooltipPositions = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
});

export type TooltipPositionStyle = {
  +xCoord: number,
  +yCoord: number,
  +verticalPosition: 'top' | 'bottom',
  +horizontalPosition: 'left' | 'right',
  +alignment: 'left' | 'center' | 'right',
};

export type TooltipPosition = $Values<typeof tooltipPositions>;

const sizeOfTooltipArrow = 10; // 7px arrow + 3px extra
const tooltipMenuItemHeight = 22; // 17px line-height + 5px padding bottom
const tooltipInnerTopPadding = 5; // 5px bottom is included in last item
const tooltipInnerPadding = 10;

const font =
  '14px -apple-system, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", ' +
  '"Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", ui-sans-serif';

type FindTooltipPositionArgs = {
  +pointingToInfo: ItemAndContainerPositionInfo,
  +tooltipTexts: $ReadOnlyArray<string>,
  +availablePositions: $ReadOnlyArray<TooltipPosition>,
  +layoutPosition: 'relative' | 'absolute',
};
function findTooltipPosition({
  pointingToInfo,
  tooltipTexts,
  availablePositions,
  layoutPosition,
}: FindTooltipPositionArgs): TooltipPosition {
  const { itemPosition: pointingTo, containerPosition } = pointingToInfo;
  const {
    height: containerHeight,
    top: containerTop,
    width: containerWidth,
    left: containerLeft,
  } = containerPosition;

  const textWidth = calculateMaxTextWidth(tooltipTexts, font);
  const width = textWidth + tooltipInnerPadding + sizeOfTooltipArrow;
  const numberOfTooltipItems = tooltipTexts.length;
  const tooltipHeight =
    numberOfTooltipItems * tooltipMenuItemHeight + tooltipInnerTopPadding;
  const heightWithArrow = tooltipHeight + sizeOfTooltipArrow;

  const absolutePositionedTooltip = layoutPosition === 'absolute';

  let canBeDisplayedInLeftPosition,
    canBeDisplayedInRightPosition,
    canBeDisplayedInTopPosition,
    canBeDisplayedInBottomPosition;
  if (absolutePositionedTooltip) {
    const pointingCenter = pointingTo.top + pointingTo.height / 2;
    const currentTop = Math.max(pointingTo.top, 0);
    const currentBottom = Math.min(pointingTo.bottom, containerHeight);
    const currentPointing = Math.max(
      Math.min(pointingCenter, containerHeight),
      0,
    );
    const canBeDisplayedSideways =
      currentPointing - tooltipHeight / 2 + containerTop >= 0 &&
      currentPointing + tooltipHeight / 2 + containerTop <= window.innerHeight;

    canBeDisplayedInLeftPosition =
      pointingTo.left - width + containerLeft >= 0 && canBeDisplayedSideways;
    canBeDisplayedInRightPosition =
      pointingTo.right + width + containerLeft <= window.innerWidth &&
      canBeDisplayedSideways;
    canBeDisplayedInTopPosition =
      currentTop - heightWithArrow + containerTop >= 0;
    canBeDisplayedInBottomPosition =
      currentBottom + heightWithArrow + containerTop <= window.innerHeight;
  } else {
    const canBeDisplayedSideways =
      pointingTo.top - (tooltipHeight - pointingTo.height) / 2 >= 0 &&
      pointingTo.bottom + (tooltipHeight - pointingTo.height) / 2 <=
        containerHeight;
    canBeDisplayedInLeftPosition =
      pointingTo.left - width >= 0 && canBeDisplayedSideways;
    canBeDisplayedInRightPosition =
      pointingTo.right + width <= containerWidth && canBeDisplayedSideways;
    canBeDisplayedInTopPosition = pointingTo.top - heightWithArrow >= 0;
    canBeDisplayedInBottomPosition =
      pointingTo.bottom + heightWithArrow <= containerHeight;
  }

  for (const tooltipPosition of availablePositions) {
    invariant(
      numberOfTooltipItems === 1 ||
        (tooltipPosition !== tooltipPositions.RIGHT &&
          tooltipPosition !== tooltipPositions.LEFT),
      `${tooltipPosition} position can be used only for single element tooltip`,
    );
    if (
      tooltipPosition === tooltipPositions.RIGHT &&
      canBeDisplayedInRightPosition
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.BOTTOM_RIGHT &&
      canBeDisplayedInBottomPosition
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.LEFT &&
      canBeDisplayedInLeftPosition
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.BOTTOM_LEFT &&
      canBeDisplayedInBottomPosition
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.TOP_LEFT &&
      canBeDisplayedInTopPosition
    ) {
      return tooltipPosition;
    } else if (
      tooltipPosition === tooltipPositions.TOP_RIGHT &&
      canBeDisplayedInTopPosition
    ) {
      return tooltipPosition;
    }
  }
  return availablePositions[availablePositions.length - 1];
}

export { findTooltipPosition, sizeOfTooltipArrow };
