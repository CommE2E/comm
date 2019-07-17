// @flow

import type { ChatMessageInfoItemWithHeight } from './message.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { ViewStyle } from '../types/styles';
import type { Corners } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ViewPropTypes } from 'react-native';

function filterCorners(
  corners: Corners,
  item: ChatMessageInfoItemWithHeight,
) {
  const { startsCluster, endsCluster } = item;
  const { isViewer } = item.messageInfo.creator;
  const { topLeft, topRight, bottomLeft, bottomRight } = corners;
  return {
    topLeft: topLeft && (isViewer || startsCluster),
    topRight: topRight && (!isViewer || startsCluster),
    bottomLeft: bottomLeft && (isViewer || endsCluster),
    bottomRight: bottomRight && (!isViewer || endsCluster),
  };
}

const allCorners = {
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
};
function getRoundedContainerStyle(
  corners: Corners,
  borderRadius?: number = 8,
) {
  const { topLeft, topRight, bottomLeft, bottomRight } = corners;
  return {
    borderTopLeftRadius: topLeft ? borderRadius : 0,
    borderTopRightRadius: topRight ? borderRadius : 0,
    borderBottomLeftRadius: bottomLeft ? borderRadius : 0,
    borderBottomRightRadius: bottomRight ? borderRadius : 0,
  };
}

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  borderRadius: number,
  style?: ViewStyle,
  children: React.Node,
|};
class RoundedMessageContainer extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    borderRadius: PropTypes.number.isRequired,
    style: ViewPropTypes.style,
    children: PropTypes.node.isRequired,
  };
  static defaultProps = {
    borderRadius: 8,
  };

  render() {
    const { item, borderRadius, style } = this.props;
    const cornerStyle = getRoundedContainerStyle(
      filterCorners(allCorners, item),
      borderRadius,
    );
    return (
      <View style={[styles.message, cornerStyle, style]}>
        {this.props.children}
      </View>
    );
  }

}

const styles = StyleSheet.create({
  message: {
    backgroundColor: 'white',
    overflow: 'hidden',
  },
});

export {
  allCorners,
  filterCorners,
  getRoundedContainerStyle,
  RoundedMessageContainer,
};
