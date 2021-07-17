// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  Image,
  StyleSheet,
  I18nManager,
  PanResponder,
  Text,
  Keyboard,
} from 'react-native';
import tinycolor from 'tinycolor2';

import { type Colors, useColors } from '../themes/colors';
import type { LayoutEvent } from '../types/react-native';
import type { ViewStyle } from '../types/styles';
import Button from './button.react';

type PanEvent = $ReadOnly<{
  nativeEvent: $ReadOnly<{
    pageX: number,
    pageY: number,
    ...
  }>,
  ...
}>;
type HSVColor = { h: number, s: number, v: number };
type PickerContainer = React.ElementRef<typeof View>;
type BaseProps = {
  +color?: string | HSVColor,
  +defaultColor?: string,
  +oldColor?: ?string,
  +onColorChange?: (color: HSVColor) => void,
  +onColorSelected?: (color: string) => void,
  +onOldColorSelected?: (color: string) => void,
  +style?: ViewStyle,
  +buttonText?: string,
  +oldButtonText?: string,
};
type Props = {
  ...BaseProps,
  +colors: Colors,
};
type State = {
  +color: HSVColor,
  +pickerSize: ?number,
};
class ColorPicker extends React.PureComponent<Props, State> {
  static defaultProps = {
    buttonText: 'Select',
    oldButtonText: 'Reset',
  };
  _layout = { width: 0, height: 0 };
  _pageX = 0;
  _pageY = 0;
  _pickerContainer: ?PickerContainer = null;
  _pickerResponder = null;
  _changingHColor = false;

  constructor(props: Props) {
    super(props);
    let color;
    if (props.defaultColor) {
      color = tinycolor(props.defaultColor).toHsv();
    } else if (props.oldColor) {
      color = tinycolor(props.oldColor).toHsv();
    } else {
      color = { h: 0, s: 1, v: 1 };
    }
    this.state = { color, pickerSize: null };
    const handleColorChange = ({ x, y }: { x: number, y: number }) => {
      if (this._changingHColor) {
        this._handleHColorChange({ x, y });
      } else {
        this._handleSVColorChange({ x, y });
      }
    };
    this._pickerResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (evt: PanEvent) => {
        const x = evt.nativeEvent.pageX;
        const y = evt.nativeEvent.pageY;
        const { s, v } = this._computeColorFromTriangle({ x, y });
        this._changingHColor = s > 1 || s < 0 || v > 1 || v < 0;
        handleColorChange({ x, y });
      },
      onPanResponderMove: (evt: PanEvent) =>
        handleColorChange({
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        }),
      onPanResponderRelease: () => true,
    });
  }

  componentDidMount() {
    Keyboard.dismiss();
  }

  _getColor(): HSVColor {
    const passedColor =
      typeof this.props.color === 'string'
        ? tinycolor(this.props.color).toHsv()
        : this.props.color;
    return passedColor || this.state.color;
  }

  _onColorSelected = () => {
    const { onColorSelected } = this.props;
    const color = tinycolor(this._getColor()).toHexString();
    onColorSelected && onColorSelected(color);
  };

  _onOldColorSelected = () => {
    const { oldColor, onOldColorSelected } = this.props;
    const color = tinycolor(oldColor);
    this.setState({ color: color.toHsv() });
    onOldColorSelected && onOldColorSelected(color.toHexString());
  };

  _onSValueChange = (s: number) => {
    const { h, v } = this._getColor();
    this._onColorChange({ h, s, v });
  };

  _onVValueChange = (v: number) => {
    const { h, s } = this._getColor();
    this._onColorChange({ h, s, v });
  };

  _onColorChange(color: HSVColor) {
    this.setState({ color });
    if (this.props.onColorChange) {
      this.props.onColorChange(color);
    }
  }

  _onLayout = (l: LayoutEvent) => {
    this._layout = l.nativeEvent.layout;
    const { width, height } = this._layout;
    const pickerSize = Math.round(Math.min(width, height));
    if (
      !this.state.pickerSize ||
      Math.abs(this.state.pickerSize - pickerSize) >= 3
    ) {
      this.setState({ pickerSize });
    }

    // We need to get pageX/pageY, ie. the absolute position of the picker on
    // the screen. This is because PanResponder's relative position information
    // is double broken (#12591, #15290). Unfortunately, the only way to get
    // absolute positioning for a View is via measure() after onLayout (#10556).
    // The setTimeout is necessary to make sure that the ColorPickerModal
    // completes its slide-in animation before we measure.
    setTimeout(() => {
      if (!this._pickerContainer) {
        return;
      }
      this._pickerContainer.measure((x, y, cWidth, cHeight, pageX, pageY) => {
        const { pickerPadding } = getPickerProperties(pickerSize);
        this._pageX = pageX;
        this._pageY = pageY - pickerPadding - 3;
      });
    }, 500);
  };

  _computeHValue(x: number, y: number) {
    const pickerSize = this.state.pickerSize;
    invariant(
      pickerSize !== null && pickerSize !== undefined,
      'pickerSize should be set',
    );
    const dx = x - pickerSize / 2;
    const dy = y - pickerSize / 2;
    const rad = Math.atan2(dx, dy) + Math.PI + Math.PI / 2;
    return ((rad * 180) / Math.PI) % 360;
  }

  _hValueToRad(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return rad - Math.PI - Math.PI / 2;
  }

  getColor(): string {
    return tinycolor(this._getColor()).toHexString();
  }

  _handleHColorChange({ x, y }: { x: number, y: number }) {
    const { s, v } = this._getColor();
    const { pickerSize } = this.state;
    invariant(
      pickerSize !== null && pickerSize !== undefined,
      'pickerSize should be set',
    );
    const marginLeft = (this._layout.width - pickerSize) / 2;
    const marginTop = (this._layout.height - pickerSize) / 2;
    const relativeX = x - this._pageX - marginLeft;
    const relativeY = y - this._pageY - marginTop;
    const h = this._computeHValue(relativeX, relativeY);
    this._onColorChange({ h, s, v });
  }

  _handleSVColorChange({ x, y }: { x: number, y: number }) {
    const { h, s: rawS, v: rawV } = this._computeColorFromTriangle({ x, y });
    const s = Math.min(Math.max(0, rawS), 1);
    const v = Math.min(Math.max(0, rawV), 1);
    this._onColorChange({ h, s, v });
  }

  _normalizeTriangleTouch(
    s: number,
    v: number,
    sRatio: number,
  ): { s: number, v: number } {
    // relative size to be considered as corner zone
    const CORNER_ZONE_SIZE = 0.12;
    // relative triangle margin to be considered as touch in triangle
    const NORMAL_MARGIN = 0.1;
    // relative triangle margin to be considered as touch in triangle
    // in corner zone
    const CORNER_MARGIN = 0.05;
    let margin = NORMAL_MARGIN;

    const posNS = v > 0 ? 1 - (1 - s) * sRatio : 1 - s * sRatio;
    const negNS = v > 0 ? s * sRatio : (1 - s) * sRatio;
    // normalized s value according to ratio and s value
    const ns = s > 1 ? posNS : negNS;

    const rightCorner = s > 1 - CORNER_ZONE_SIZE && v > 1 - CORNER_ZONE_SIZE;
    const leftCorner = ns < 0 + CORNER_ZONE_SIZE && v > 1 - CORNER_ZONE_SIZE;
    const topCorner = ns < 0 + CORNER_ZONE_SIZE && v < 0 + CORNER_ZONE_SIZE;
    if (rightCorner) {
      return { s, v };
    }
    if (leftCorner || topCorner) {
      margin = CORNER_MARGIN;
    }
    // color normalization according to margin
    s = s < 0 && ns > 0 - margin ? 0 : s;
    s = s > 1 && ns < 1 + margin ? 1 : s;
    v = v < 0 && v > 0 - margin ? 0 : v;
    v = v > 1 && v < 1 + margin ? 1 : v;
    return { s, v };
  }

  /**
   * Computes s, v from position (x, y). If position is outside of triangle,
   * it will return invalid values (greater than 1 or lower than 0)
   */
  _computeColorFromTriangle({ x, y }: { x: number, y: number }): HSVColor {
    const { pickerSize } = this.state;
    invariant(
      pickerSize !== null && pickerSize !== undefined,
      'pickerSize should be set',
    );
    const { triangleHeight, triangleWidth } = getPickerProperties(pickerSize);

    const left = pickerSize / 2 - triangleWidth / 2;
    const top = pickerSize / 2 - (2 * triangleHeight) / 3;

    // triangle relative coordinates
    const marginLeft = (this._layout.width - pickerSize) / 2;
    const marginTop = (this._layout.height - pickerSize) / 2;
    const relativeX = x - this._pageX - marginLeft - left;
    const relativeY = y - this._pageY - marginTop - top;

    // rotation
    const { h } = this._getColor();
    // starting angle is 330 due to comfortable calculation
    const deg = (h - 330 + 360) % 360;
    const rad = (deg * Math.PI) / 180;
    const center = {
      x: triangleWidth / 2,
      y: (2 * triangleHeight) / 3,
    };
    const rotated = rotatePoint({ x: relativeX, y: relativeY }, rad, center);

    const line = (triangleWidth * rotated.y) / triangleHeight;
    const margin =
      triangleWidth / 2 - ((triangleWidth / 2) * rotated.y) / triangleHeight;
    const s = (rotated.x - margin) / line;
    const v = rotated.y / triangleHeight;

    // normalize
    const normalized = this._normalizeTriangleTouch(
      s,
      v,
      line / triangleHeight,
    );

    return { h, s: normalized.s, v: normalized.v };
  }

  render() {
    const { pickerSize } = this.state;
    const { style } = this.props;
    const color = this._getColor();
    const tc = tinycolor(color);
    const selectedColor: string = tc.toHexString();
    const isDark: boolean = tc.isDark();
    const { modalIosHighlightUnderlay: underlayColor } = this.props.colors;

    let picker = null;
    if (pickerSize) {
      const pickerResponder = this._pickerResponder;
      invariant(pickerResponder, 'should be set');
      const { h } = color;
      const indicatorColor = tinycolor({ h, s: 1, v: 1 }).toHexString();
      const angle = this._hValueToRad(h);
      const computed = makeComputedStyles({
        pickerSize,
        selectedColor,
        selectedColorHsv: color,
        indicatorColor,
        oldColor: this.props.oldColor,
        angle,
        isRTL: I18nManager.isRTL,
      });
      picker = (
        <View style={styles.pickerContainer}>
          <View>
            <View
              style={[styles.triangleContainer, computed.triangleContainer]}
            >
              <View
                style={[
                  styles.triangleUnderlayingColor,
                  computed.triangleUnderlayingColor,
                ]}
              />
              <Image
                style={computed.triangleImage}
                source={require('../img/hsv_triangle_mask.png')}
              />
            </View>
            <View
              {...pickerResponder.panHandlers}
              style={computed.picker}
              collapsable={false}
            >
              <Image
                source={require('../img/color-circle.png')}
                resizeMode="contain"
                style={styles.pickerImage}
              />
              <View style={[styles.pickerIndicator, computed.pickerIndicator]}>
                <View
                  style={[
                    styles.pickerIndicatorTick,
                    computed.pickerIndicatorTick,
                  ]}
                />
              </View>
              <View style={[styles.svIndicator, computed.svIndicator]} />
            </View>
          </View>
        </View>
      );
    }

    let oldColorButton = null;
    if (this.props.oldColor) {
      const oldTinyColor = tinycolor(this.props.oldColor);
      const oldButtonTextStyle = {
        color: oldTinyColor.isDark() ? 'white' : 'black',
      };
      oldColorButton = (
        <Button
          topStyle={styles.colorPreview}
          style={[
            styles.buttonContents,
            { backgroundColor: oldTinyColor.toHexString() },
          ]}
          onPress={this._onOldColorSelected}
          iosFormat="highlight"
          iosHighlightUnderlayColor={underlayColor}
          iosActiveOpacity={0.6}
        >
          <Text style={[styles.buttonText, oldButtonTextStyle]}>
            {this.props.oldButtonText}
          </Text>
        </Button>
      );
    }
    const colorPreviewsStyle = {
      height: this.state.pickerSize
        ? this.state.pickerSize * 0.1 // responsive height
        : 20,
    };
    const buttonContentsStyle = {
      backgroundColor: selectedColor,
    };
    const buttonTextStyle = {
      color: isDark ? 'white' : 'black',
    };
    return (
      <View
        onLayout={this._onLayout}
        ref={this.pickerContainerRef}
        style={style}
      >
        {picker}
        <View style={[styles.colorPreviews, colorPreviewsStyle]}>
          {oldColorButton}
          <Button
            style={[styles.buttonContents, buttonContentsStyle]}
            topStyle={styles.colorPreview}
            onPress={this._onColorSelected}
            iosFormat="highlight"
            iosHighlightUnderlayColor={underlayColor}
            iosActiveOpacity={0.6}
          >
            <Text style={[styles.buttonText, buttonTextStyle]}>
              {this.props.buttonText}
            </Text>
          </Button>
        </View>
      </View>
    );
  }

  pickerContainerRef = (pickerContainer: ?PickerContainer) => {
    this._pickerContainer = pickerContainer;
  };
}

function getPickerProperties(pickerSize) {
  const indicatorPickerRatio = 42 / 510; // computed from picker image
  const originalIndicatorSize = indicatorPickerRatio * pickerSize;
  const indicatorSize = originalIndicatorSize;
  const pickerPadding = originalIndicatorSize / 3;

  const triangleSize = pickerSize - 6 * pickerPadding;
  const triangleRadius = triangleSize / 2;
  const triangleHeight = (triangleRadius * 3) / 2;
  // pythagorean theorem
  const triangleWidth = 2 * triangleRadius * Math.sqrt(3 / 4);

  return {
    triangleSize,
    triangleRadius,
    triangleHeight,
    triangleWidth,
    indicatorPickerRatio,
    indicatorSize,
    pickerPadding,
  };
}

const makeComputedStyles = ({
  indicatorColor,
  angle,
  pickerSize,
  selectedColorHsv,
  isRTL,
}) => {
  const {
    triangleSize,
    triangleHeight,
    triangleWidth,
    indicatorSize,
    pickerPadding,
  } = getPickerProperties(pickerSize);

  /* ===== INDICATOR ===== */
  const indicatorRadius = pickerSize / 2 - indicatorSize / 2 - pickerPadding;
  const mx = pickerSize / 2;
  const my = pickerSize / 2;
  const dx = Math.cos(angle) * indicatorRadius;
  const dy = Math.sin(angle) * indicatorRadius;

  /* ===== TRIANGLE ===== */
  const triangleTop = pickerPadding * 3;
  const triangleLeft = pickerPadding * 3;
  const triangleAngle = -angle + Math.PI / 3;

  /* ===== SV INDICATOR ===== */
  const markerColor = 'rgba(0,0,0,0.8)';
  const { s, v, h } = selectedColorHsv;
  const svIndicatorSize = 18;
  const svY = v * triangleHeight;
  const margin = triangleWidth / 2 - v * (triangleWidth / 2);
  const svX = s * (triangleWidth - 2 * margin) + margin;
  const svIndicatorMarginLeft = (pickerSize - triangleWidth) / 2;
  const svIndicatorMarginTop = (pickerSize - (4 * triangleHeight) / 3) / 2;

  // starting angle is 330 due to comfortable calculation
  const deg = (h - 330 + 360) % 360;
  const rad = (deg * Math.PI) / 180;
  const center = { x: pickerSize / 2, y: pickerSize / 2 };
  const notRotatedPoint = {
    x: svIndicatorMarginTop + svY,
    y: svIndicatorMarginLeft + svX,
  };
  const svIndicatorPoint = rotatePoint(notRotatedPoint, rad, center);

  const offsetDirection: string = isRTL ? 'right' : 'left';
  return {
    picker: {
      padding: pickerPadding,
      width: pickerSize,
      height: pickerSize,
    },
    pickerIndicator: {
      top: mx + dx - indicatorSize / 2,
      [offsetDirection]: my + dy - indicatorSize / 2,
      width: indicatorSize,
      height: indicatorSize,
      transform: [
        {
          rotate: -angle + 'rad',
        },
      ],
    },
    pickerIndicatorTick: {
      height: indicatorSize / 2,
      backgroundColor: markerColor,
    },
    svIndicator: {
      top: svIndicatorPoint.x - svIndicatorSize / 2,
      [offsetDirection]: svIndicatorPoint.y - svIndicatorSize / 2,
      width: svIndicatorSize,
      height: svIndicatorSize,
      borderRadius: svIndicatorSize / 2,
      borderColor: markerColor,
    },
    triangleContainer: {
      width: triangleSize,
      height: triangleSize,
      transform: [
        {
          rotate: triangleAngle + 'rad',
        },
      ],
      top: triangleTop,
      left: triangleLeft,
    },
    triangleImage: {
      width: triangleWidth,
      height: triangleHeight,
    },
    triangleUnderlayingColor: {
      left: (triangleSize - triangleWidth) / 2,
      borderLeftWidth: triangleWidth / 2,
      borderRightWidth: triangleWidth / 2,
      borderBottomWidth: triangleHeight,
      borderBottomColor: indicatorColor,
    },
  };
};

type Point = { x: number, y: number };
function rotatePoint(
  point: Point,
  angle: number,
  center: Point = { x: 0, y: 0 },
) {
  // translation to origin
  const transOriginX = point.x - center.x;
  const transOriginY = point.y - center.y;

  // rotation around origin
  const rotatedX =
    transOriginX * Math.cos(angle) - transOriginY * Math.sin(angle);
  const rotatedY =
    transOriginY * Math.cos(angle) + transOriginX * Math.sin(angle);

  // translate back from origin
  const normalizedX = rotatedX + center.x;
  const normalizedY = rotatedY + center.y;
  return {
    x: normalizedX,
    y: normalizedY,
  };
}

const styles = StyleSheet.create({
  buttonContents: {
    borderRadius: 3,
    flex: 1,
    padding: 3,
  },
  buttonText: {
    flex: 1,
    fontSize: 20,
    textAlign: 'center',
  },
  colorPreview: {
    flex: 1,
    marginHorizontal: 5,
  },
  colorPreviews: {
    flexDirection: 'row',
  },
  pickerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  pickerImage: {
    flex: 1,
    height: null,
    width: null,
  },
  pickerIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  pickerIndicatorTick: {
    width: 5,
  },
  svIndicator: {
    borderWidth: 4,
    position: 'absolute',
  },
  triangleContainer: {
    alignItems: 'center',
    position: 'absolute',
  },
  triangleUnderlayingColor: {
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
    height: 0,
    position: 'absolute',
    top: 0,
    width: 0,
  },
});

const ConnectedColorPicker: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedColorPicker(props: BaseProps) {
    const colors = useColors();
    return <ColorPicker {...props} colors={colors} />;
  },
);

export default ConnectedColorPicker;
