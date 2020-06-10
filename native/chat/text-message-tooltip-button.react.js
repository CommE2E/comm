// @flow

import {
  verticalBoundsPropType,
  layoutCoordinatesPropType,
} from '../types/layout-types';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { AppState } from '../redux/redux-setup';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';

import * as React from 'react';
import Animated from 'react-native-reanimated';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { dimensionsSelector } from '../selectors/dimension-selectors';
import InnerTextMessage from './inner-text-message.react';
import { MessageHeader } from './message-header.react';

/* eslint-disable import/no-named-as-default-member */
const { Value } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {
  navigation: AppNavigationProp<'TextMessageTooltipModal'>,
  route: TooltipRoute<'TextMessageTooltipModal'>,
  progress: Value,
  // Redux state
  screenDimensions: Dimensions,
};
class TextMessageTooltipButton extends React.PureComponent<Props> {
  static propTypes = {
    navigation: PropTypes.shape({
      goBackOnce: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
      params: PropTypes.shape({
        initialCoordinates: layoutCoordinatesPropType.isRequired,
        verticalBounds: verticalBoundsPropType.isRequired,
        location: PropTypes.oneOf(['above', 'below']),
        margin: PropTypes.number,
        item: chatMessageItemPropType.isRequired,
      }).isRequired,
    }).isRequired,
    progress: PropTypes.object.isRequired,
    screenDimensions: dimensionsPropType.isRequired,
  };

  get headerStyle() {
    const { initialCoordinates } = this.props.route.params;
    const bottom = initialCoordinates.height;
    return {
      opacity: this.props.progress,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: this.props.screenDimensions.width,
      bottom,
    };
  }

  render() {
    const { item } = this.props.route.params;
    return (
      <React.Fragment>
        <Animated.View style={this.headerStyle}>
          <MessageHeader item={item} focused={true} display="modal" />
        </Animated.View>
        <InnerTextMessage item={item} onPress={this.onPress} />
      </React.Fragment>
    );
  }

  onPress = () => {
    this.props.navigation.goBackOnce();
  };
}

export default connect((state: AppState) => ({
  screenDimensions: dimensionsSelector(state),
}))(TextMessageTooltipButton);
