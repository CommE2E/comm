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
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
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

type NavProp<CustomProps> = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {
    ...CustomProps,
    initialCoordinates: LayoutCoordinates,
    verticalBounds: VerticalBounds,
  },
|}>;

type ButtonProps<Navigation> = {
  navigation: Navigation,
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

    get contentContainerStyle() {
      const { verticalBounds } = this.props.navigation.state.params;
      const fullScreenHeight = this.props.screenDimensions.height
        + contentBottomOffset;
      const top = verticalBounds.y;
      const bottom = fullScreenHeight
        - verticalBounds.y - verticalBounds.height;
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
      const { navigation } = this.props;
      return (
        <TouchableWithoutFeedback onPress={this.onPressBackdrop}>
          <View style={styles.backdrop}>
            <View style={this.contentContainerStyle}>
              <View style={this.buttonStyle}>
                <ButtonComponent navigation={navigation} />
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      );
    }

    onPressBackdrop = () => {
      this.props.navigation.goBack();
    }

  }
  return connect(
    (state: AppState) => ({
      screenDimensions: dimensionsSelector(state),
    }),
  )(Tooltip);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    opacity: 0.7,
    backgroundColor: 'black',
  },
  contentContainer: {
    flex: 1,
    overflow: "hidden",
  },
});

export {
  createTooltip,
};
