// @flow

import { findTooltipPosition, tooltipPositions } from './tooltip-utils.js';
import type { PositionInfo } from '../chat/position-types.js';

const QHDWindow = {
  width: 2560,
  height: 1440,
};

const tooltipSourcePositionCenter: PositionInfo = {
  width: 200,
  height: 300,
  left: QHDWindow.width / 2 - 100,
  top: QHDWindow.height / 2 - 150,
  right: QHDWindow.width / 2 + 100,
  bottom: QHDWindow.height / 2 + 150,
};

const tooltipSourcePositionTopRight: PositionInfo = {
  width: 200,
  height: 300,
  left: QHDWindow.width - 200,
  top: 65, // app top bar height
  right: QHDWindow.width,
  bottom: 300 + 65, // tooltip height + app top bar height
};

const tooltipSourcePositionBottomLeft: PositionInfo = {
  width: 200,
  height: 300,
  left: 0,
  top: QHDWindow.height - 300,
  right: 200,
  bottom: QHDWindow.height,
};

const tooltipSizeSmall = {
  width: 100,
  height: 200,
};

const tooltipSizeBig = {
  width: 300,
  height: 500,
};

const allTooltipPositions = [
  tooltipPositions.LEFT,
  tooltipPositions.LEFT_TOP,
  tooltipPositions.LEFT_BOTTOM,
  tooltipPositions.RIGHT,
  tooltipPositions.RIGHT_TOP,
  tooltipPositions.RIGHT_BOTTOM,
  tooltipPositions.TOP,
  tooltipPositions.BOTTOM,
];

const sidewaysTooltipPositions = [
  tooltipPositions.LEFT,
  tooltipPositions.LEFT_TOP,
  tooltipPositions.LEFT_BOTTOM,
  tooltipPositions.RIGHT,
  tooltipPositions.RIGHT_TOP,
  tooltipPositions.RIGHT_BOTTOM,
];

const topAndBottomTooltipPositions = [
  tooltipPositions.TOP,
  tooltipPositions.BOTTOM,
];

const onlyLeftTooltipPositions = [
  tooltipPositions.LEFT,
  tooltipPositions.LEFT_BOTTOM,
  tooltipPositions.LEFT_TOP,
];

beforeAll(() => {
  window.innerWidth = QHDWindow.width;
  window.innerHeight = QHDWindow.height;
});

afterAll(() => {
  window.innerWidth = 1024;
  window.innerHeight = 768;
});

describe('findTooltipPosition', () => {
  it(
    'should return first position if there is enough space ' +
      'in every direction',
    () =>
      expect(
        findTooltipPosition({
          sourcePositionInfo: tooltipSourcePositionCenter,
          tooltipSize: tooltipSizeSmall,
          availablePositions: allTooltipPositions,
          defaultPosition: allTooltipPositions[0],
        }),
      ).toMatch(allTooltipPositions[0]),
  );

  it(
    'should return first non-left position ' +
      'if there is no space on the left',
    () =>
      expect(
        findTooltipPosition({
          sourcePositionInfo: tooltipSourcePositionBottomLeft,
          tooltipSize: tooltipSizeSmall,
          availablePositions: sidewaysTooltipPositions,
          defaultPosition: sidewaysTooltipPositions[0],
        }),
      ).toMatch(tooltipPositions.RIGHT),
  );

  it('should return bottom position if there is no space on the top ', () =>
    expect(
      findTooltipPosition({
        sourcePositionInfo: tooltipSourcePositionTopRight,
        tooltipSize: tooltipSizeSmall,
        availablePositions: topAndBottomTooltipPositions,
        defaultPosition: topAndBottomTooltipPositions[0],
      }),
    ).toMatch(tooltipPositions.BOTTOM));

  it(
    'should return top left position if the tooltip is higher than the ' +
      'source object and there is no enough space on the top',
    () =>
      expect(
        findTooltipPosition({
          sourcePositionInfo: tooltipSourcePositionTopRight,
          tooltipSize: tooltipSizeBig,
          availablePositions: onlyLeftTooltipPositions,
          defaultPosition: onlyLeftTooltipPositions[0],
        }),
      ).toMatch(tooltipPositions.LEFT_TOP),
  );

  it(
    'should return bottom position on left ' +
      'to prevent covering element below source',
    () =>
      expect(
        findTooltipPosition({
          sourcePositionInfo: tooltipSourcePositionCenter,
          tooltipSize: tooltipSizeBig,
          availablePositions: onlyLeftTooltipPositions,
          defaultPosition: onlyLeftTooltipPositions[0],
          preventDisplayingBelowSource: true,
        }),
      ).toMatch(tooltipPositions.LEFT_BOTTOM),
  );

  it(
    'should return first position ' +
      'that does not cover element below source ',
    () =>
      expect(
        findTooltipPosition({
          sourcePositionInfo: tooltipSourcePositionCenter,
          tooltipSize: tooltipSizeBig,
          availablePositions: [
            tooltipPositions.BOTTOM,
            tooltipPositions.RIGHT,
            tooltipPositions.RIGHT_TOP,
            tooltipPositions.LEFT,
            tooltipPositions.LEFT_TOP,
            tooltipPositions.TOP,
            tooltipPositions.LEFT_BOTTOM,
          ],
          defaultPosition: tooltipPositions.BOTTOM,
          preventDisplayingBelowSource: true,
        }),
      ).toMatch(tooltipPositions.TOP),
  );

  it(
    'should return default position ' +
      'if an empty array of available is provided',
    () =>
      expect(
        findTooltipPosition({
          sourcePositionInfo: tooltipSourcePositionCenter,
          tooltipSize: tooltipSizeSmall,
          availablePositions: [],
          defaultPosition: tooltipPositions.LEFT_BOTTOM,
        }),
      ).toMatch(tooltipPositions.LEFT_BOTTOM),
  );

  it('should return default position if an no position is available', () =>
    expect(
      findTooltipPosition({
        sourcePositionInfo: tooltipSourcePositionTopRight,
        tooltipSize: tooltipSizeBig,
        availablePositions: allTooltipPositions,
        defaultPosition: tooltipPositions.BOTTOM,
        preventDisplayingBelowSource: true,
      }),
    ).toMatch(tooltipPositions.BOTTOM));
});
