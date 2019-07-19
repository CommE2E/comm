// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
  NavigationScene,
  NavigationTransitionProps,
} from 'react-navigation';
import {
  type VerticalBounds,
  verticalBoundsPropType,
  type LayoutCoordinates,
  layoutCoordinatesPropType,
} from '../types/lightbox-types';
import type { AppState } from '../redux/redux-setup';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import type { ViewStyle } from '../types/styles';
import type { TooltipEntry } from './tooltip2-item.react';

import * as React from 'react';
import Animated from 'react-native-reanimated';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import {
  contentBottomOffset,
  dimensionsSelector,
} from '../selectors/dimension-selectors';
import TooltipItem from './tooltip2-item.react';

const {
  Value,
  Extrapolate,
  add,
  multiply,
  interpolate,
} = Animated;

type TooltipSpec<CustomProps> = {|
  entries: $ReadOnlyArray<TooltipEntry<CustomProps>>,
  labelStyle?: ViewStyle,
|};

type NavProp<CustomProps> = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {
    ...$Exact<CustomProps>,
    initialCoordinates: LayoutCoordinates,
    verticalBounds: VerticalBounds,
    location?: 'above' | 'below',
    margin?: number,
  },
|}>;

type ButtonProps<Navigation> = {
  navigation: Navigation,
  progress: Value,
};

type TooltipProps<Navigation> = {
  navigation: Navigation,
  scene: NavigationScene,
  transitionProps: NavigationTransitionProps,
  position: Value,
  screenDimensions: Dimensions,
};
function createTooltip<
  CustomProps: {},
  Navigation: NavProp<CustomProps>,
  TooltipPropsType: TooltipProps<Navigation>,
  ButtonComponentType: React.ComponentType<ButtonProps<Navigation>>,
  TooltipComponent: React.ComponentType<TooltipPropsType>,
>(
  ButtonComponent: ButtonComponentType,
  tooltipSpec: TooltipSpec<CustomProps>,
): TooltipComponent {
  class Tooltip extends React.PureComponent<TooltipPropsType> {

    static propTypes = {
      navigation: PropTypes.shape({
        state: PropTypes.shape({
          params: PropTypes.shape({
            initialCoordinates: layoutCoordinatesPropType.isRequired,
            verticalBounds: verticalBoundsPropType.isRequired,
          }).isRequired,
        }).isRequired,
        goBack: PropTypes.func.isRequired,
      }).isRequired,
      transitionProps: PropTypes.object.isRequired,
      scene: PropTypes.object.isRequired,
      position: PropTypes.instanceOf(Value).isRequired,
      screenDimensions: dimensionsPropType.isRequired,
    };
    progress: Value;
    backdropOpacity: Value;
    tooltipVerticalAbove: Value;
    tooltipVerticalBelow: Value;
    tooltipHorizontalOffset = new Animated.Value(0);
    tooltipHorizontal: Value;

    constructor(props: TooltipPropsType) {
      super(props);

      const { position } = props;
      const { index } = props.scene;
      this.progress = interpolate(
        position,
        {
          inputRange: [ index - 1, index ],
          outputRange: [ 0, 1 ],
          extrapolate: Extrapolate.CLAMP,
        },
      );
      this.backdropOpacity = interpolate(
        this.progress,
        {
          inputRange: [ 0, 1 ],
          outputRange: [ 0, 0.7 ],
          extrapolate: Extrapolate.CLAMP,
        },
      );

      const { initialCoordinates } = props.navigation.state.params;
      const { y, height } = initialCoordinates;
      const entryCount = tooltipSpec.entries.length;
      const { margin } = this;
      this.tooltipVerticalAbove = interpolate(
        this.progress,
        {
          inputRange: [ 0, 1 ],
          outputRange: [ margin + tooltipHeight(entryCount) / 2, 0 ],
          extrapolate: Extrapolate.CLAMP,
        },
      );
      this.tooltipVerticalBelow = interpolate(
        this.progress,
        {
          inputRange: [ 0, 1 ],
          outputRange: [ -margin - tooltipHeight(entryCount) / 2, 0 ],
          extrapolate: Extrapolate.CLAMP,
        },
      );

      this.tooltipHorizontal = multiply(
        add(1, multiply(-1, this.progress)),
        this.tooltipHorizontalOffset,
      );
    }

    get opacityStyle() {
      return {
        ...styles.backdrop,
        opacity: this.backdropOpacity,
      };
    }

    get contentContainerStyle() {
      const { verticalBounds } = this.props.navigation.state.params;
      const fullScreenHeight = this.props.screenDimensions.height
        + contentBottomOffset;
      const top = verticalBounds.y;
      const bottom = fullScreenHeight - verticalBounds.y - verticalBounds.height;
      return {
        ...styles.contentContainer,
        marginTop: top,
        marginBottom: bottom,
      };
    }

    get buttonStyle() {
      const { params } = this.props.navigation.state;
      const { initialCoordinates, verticalBounds } = params;
      const { x, y, width, height } = initialCoordinates;
      return {
        width,
        height,
        marginTop: y - verticalBounds.y,
        marginLeft: x,
      };
    }

    get margin() {
      const customMargin = this.props.navigation.state.params.margin;
      return customMargin !== null && customMargin !== undefined
        ? customMargin
        : 20;
    }

    get tooltipContainerStyle() {
      const { screenDimensions, navigation } = this.props;
      const {
        initialCoordinates,
        verticalBounds,
        location,
      } = navigation.state.params;
      const { x, y, width, height } = initialCoordinates;
      const { margin } = this;

      const style: ViewStyle = {
        position: 'absolute',
        alignItems: 'center',
        transform: [
          { translateX: this.tooltipHorizontal },
        ],
      };

      const extraLeftSpace = x;
      const extraRightSpace = screenDimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        style.left = 0;
        style.minWidth = width + 2 * extraLeftSpace;
      } else {
        style.right = 0;
        style.minWidth = width + 2 * extraRightSpace;
      }

      if (location === 'above') {
        const fullScreenHeight = screenDimensions.height + contentBottomOffset;
        style.bottom = fullScreenHeight -
          Math.max(y, verticalBounds.y) +
          margin;
        style.transform.push({ translateY: this.tooltipVerticalAbove });
      } else {
        style.top = Math.min(
          y + height,
          verticalBounds.y + verticalBounds.height,
        ) + margin;
        style.transform.push({ translateY: this.tooltipVerticalBelow });
      }
      style.transform.push({ scale: this.progress });
      return style;
    }

    render() {
      const { navigation } = this.props;

      const entries = tooltipSpec.entries.map((entry, index) => {
        const style = index !== tooltipSpec.entries.length - 1
          ? styles.itemMargin
          : null;
        return (
          <TooltipItem
            key={index}
            spec={entry}
            onPress={this.onPressEntry}
            containerStyle={style}
            labelStyle={[ styles.label, tooltipSpec.labelStyle ]}
          />
        );
      });

      let triangleDown = null;
      let triangleUp = null;
      const { location, initialCoordinates } = navigation.state.params;
      const { x, width } = initialCoordinates;
      const triangleStyle = { left: x + (width - 20) / 2 };
      if (location === 'above') {
        triangleDown = (
          <View style={[ styles.triangleDown, triangleStyle ]} />
        );
      } else {
        triangleUp = (
          <View style={[ styles.triangleUp, triangleStyle ]} />
        );
      }

      return (
        <TouchableWithoutFeedback onPress={this.onPressBackdrop}>
          <View style={styles.container}>
            <Animated.View style={this.opacityStyle} />
            <View style={this.contentContainerStyle}>
              <View style={this.buttonStyle}>
                <ButtonComponent
                  navigation={navigation}
                  progress={this.progress}
                />
              </View>
            </View>
            <Animated.View
              style={this.tooltipContainerStyle}
              onLayout={this.onTooltipContainerLayout}
            >
              {triangleUp}
              <View style={styles.entries}>
                {entries}
              </View>
              {triangleDown}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      );
    }

    onPressBackdrop = () => {
      this.props.navigation.goBack();
    }

    onPressEntry = (entry: TooltipEntry<CustomProps>) => {
      const {
        initialCoordinates,
        verticalBounds,
        location,
        ...customProps
      } = this.props.navigation.state.params;
      entry.onPress(customProps);
      this.props.navigation.goBack();
    }

    onTooltipContainerLayout = (
      event: { nativeEvent: { layout: { x: number, width: number } } },
    ) => {
      const { navigation, screenDimensions } = this.props;
      const { x, width } = navigation.state.params.initialCoordinates;

      const extraLeftSpace = x;
      const extraRightSpace = screenDimensions.width - width - x;

      const actualWidth = event.nativeEvent.layout.width;
      if (extraLeftSpace < extraRightSpace) {
        const minWidth = width + 2 * extraLeftSpace;
        this.tooltipHorizontalOffset.setValue((minWidth - actualWidth) / 2);
      } else {
        const minWidth = width + 2 * extraRightSpace;
        this.tooltipHorizontalOffset.setValue((actualWidth - minWidth) / 2);
      }
    }

  }
  return connect(
    (state: AppState) => ({
      screenDimensions: dimensionsSelector(state),
    }),
  )(Tooltip);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "black",
  },
  contentContainer: {
    flex: 1,
    overflow: "hidden",
  },
  entries: {
    borderRadius: 5,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  itemMargin: {
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  triangleDown: {
    alignSelf: 'flex-start',
    width: 10,
    height: 10,
    borderStyle: 'solid',
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 0,
    borderLeftWidth: 10,
    borderTopColor: 'white',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    top: Platform.OS === "android" ? -1 : 0,
  },
  triangleUp: {
    alignSelf: 'flex-start',
    width: 10,
    height: 10,
    borderStyle: 'solid',
    borderTopWidth: 0,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 10,
    borderBottomColor: 'white',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  label: {
    fontSize: 14,
    lineHeight: 17,
  },
});

function tooltipHeight(numEntries: number) {
  // 10 (triangle) + 37 * numEntries (entries) + numEntries - 1 (padding)
  return 9 + 38 * numEntries;
}

export {
  createTooltip,
  tooltipHeight,
};
