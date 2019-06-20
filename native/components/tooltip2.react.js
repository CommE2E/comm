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

import * as React from 'react';
import Animated, { Easing } from 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import {
  contentBottomOffset,
  dimensionsSelector,
} from '../selectors/dimension-selectors';

const {
  Value,
} = Animated;

type TooltipEntry<CustomProps> = {|
  text: string,
  onPress: (props: CustomProps) => mixed,
|};
type TooltipSpec<CustomProps> = $ReadOnlyArray<TooltipEntry<CustomProps>>;

type NavParams<CustomProps> = {
  ...CustomProps,
  initialCoordinates: LayoutCoordinates,
  verticalBounds: VerticalBounds,
};

type NavProp<NavParams> = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: NavParams,
|}>;

type TooltipProps<NavParams> = {
  navigation: NavProp<NavParams>,
  scene: NavigationScene,
  transitionProps: NavigationTransitionProps,
  position: Value,
  screenDimensions: Dimensions,
};
function createTooltip<
  CustomProps: {},
  NavParamsType: NavParams<CustomProps>,
  TooltipPropsType: TooltipProps<NavParamsType>,
  ButtonComponentType: React.ComponentType<NavParamsType>,
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

    get contentContainerStyle() {
      const { verticalBounds } = this.props.navigation.state.params;
      const fullScreenHeight = this.props.screenDimensions.height
        + contentBottomOffset;
      const top = verticalBounds.y;
      const bottom = fullScreenHeight - verticalBounds.y - verticalBounds.height;
      const verticalStyle = { marginTop: top, marginBottom: bottom };
      return [ styles.contentContainer, verticalStyle ];
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

    render() {
      const { params } = this.props.navigation.state;
      return (
        <View style={this.contentContainerStyle}>
          <View style={this.buttonStyle}>
            <ButtonComponent {...params} />
          </View>
        </View>
      );
      // TODO handle opacity animation (or not?)
    }

  }
  return connect(
    (state: AppState) => ({
      screenDimensions: dimensionsSelector(state),
    }),
  )(Tooltip);
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    overflow: "hidden",
  },
});

export {
  createTooltip,
};
