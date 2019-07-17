// @flow

import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';
import {
  type VerticalBounds,
  verticalBoundsPropType,
  type LayoutCoordinates,
  layoutCoordinatesPropType,
} from '../types/lightbox-types';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { dimensionsSelector } from '../selectors/dimension-selectors';
import Timestamp from './timestamp.react';
import InnerTextMessage from './inner-text-message.react';

type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {
    // Tooltip props
    initialCoordinates: LayoutCoordinates,
    verticalBounds: VerticalBounds,
    location?: 'above' | 'below',
    margin?: number,
    // Custom props
    item: ChatTextMessageInfoItemWithHeight,
  },
|}>;

type Props = {
  navigation: NavProp,
  // Redux state
  screenDimensions: Dimensions,
};
class TextMessageTooltipButton extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          initialCoordinates: layoutCoordinatesPropType.isRequired,
          verticalBounds: verticalBoundsPropType.isRequired,
          location: PropTypes.oneOf([ 'above', 'below' ]),
          margin: PropTypes.number,
          item: chatMessageItemPropType.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    screenDimensions: dimensionsPropType.isRequired,
  };

  get timestampStyle() {
    const { initialCoordinates } = this.props.navigation.state.params;
    return {
      position: 'absolute',
      left: -initialCoordinates.x,
      width: this.props.screenDimensions.width,
      top: -26,
    };
  }

  get messageStyle() {
    const { item } = this.props.navigation.state.params;
    return {
      position: 'absolute',
      height: item.contentHeight,
      width: this.props.screenDimensions.width,
      left: 0,
      top: 0,
    };
  }

  render() {
    const { item } = this.props.navigation.state.params;
    const { time } = item.messageInfo;
    return (
      <React.Fragment>
        <View style={this.timestampStyle}>
          <Timestamp time={time} color="light" />
        </View>
        <InnerTextMessage 
          item={item}
          focused={true}
          onPress={this.onPress}
        />
      </React.Fragment>
    );
  }

  onPress = () => {
    this.props.navigation.goBack();
  }

}

export default connect((state: AppState) => ({
  screenDimensions: dimensionsSelector(state),
}))(TextMessageTooltipButton);
