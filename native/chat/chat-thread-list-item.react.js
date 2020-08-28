// @flow

import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Text, Animated } from 'react-native';
import PropTypes from 'prop-types';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { shortAbsoluteDate } from 'lib/utils/date-utils';
import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import MessagePreview from './message-preview.react';
import ColorSplotch from '../components/color-splotch.react';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import { SingleLine } from '../components/single-line.react';
import ChatThreadListSidebar from './chat-thread-list-sidebar.react';

type Props = {
  data: ChatThreadItem,
  onPressItem: (threadInfo: ThreadInfo) => void,
  // Redux state
  colors: Colors,
  styles: typeof styles,
  windowWidth: number,
};
class ChatThreadListItem extends React.PureComponent<Props> {
  static propTypes = {
    data: chatThreadItemPropType.isRequired,
    onPressItem: PropTypes.func.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    windowWidth: PropTypes.number.isRequired,
  };

  lastMessage() {
    const mostRecentMessageInfo = this.props.data.mostRecentMessageInfo;
    if (!mostRecentMessageInfo) {
      return (
        <Text style={this.props.styles.noMessages} numberOfLines={1}>
          No messages
        </Text>
      );
    }
    return (
      <MessagePreview
        messageInfo={mostRecentMessageInfo}
        threadInfo={this.props.data.threadInfo}
      />
    );
  }

  renderRightActions = progress => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [180, 0],
    });
    const trans2 = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [120, 0],
    });
    const trans3 = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [60, 0],
    });

    const commonActionStyle = [
      this.props.styles.action,
      {
        width: this.props.windowWidth + 60,
        marginRight: -this.props.windowWidth,
        paddingRight: this.props.windowWidth,
      },
    ];

    return (
      <View style={this.props.styles.actionsContainer}>
        <Animated.View
          style={{
            transform: [{ translateX: trans }],
          }}
        >
          <Button
            onPress={() => {}}
            style={[
              ...commonActionStyle,
              {
                backgroundColor: this.props.colors.greenButton,
              },
            ]}
          >
            <Text>Action1</Text>
          </Button>
        </Animated.View>
        <Animated.View
          style={{
            transform: [{ translateX: trans2 }],
          }}
        >
          <Button
            onPress={() => {}}
            style={[
              ...commonActionStyle,
              {
                backgroundColor: this.props.colors.redButton,
              },
            ]}
          >
            <Text>Action2</Text>
          </Button>
        </Animated.View>
        <Animated.View
          style={{
            transform: [{ translateX: trans3 }],
          }}
        >
          <Button
            onPress={() => {}}
            style={[
              ...commonActionStyle,
              {
                backgroundColor: this.props.colors.mintButton,
              },
            ]}
          >
            <Text>Action3</Text>
          </Button>
        </Animated.View>
      </View>
    );
  };

  render() {
    const { listIosHighlightUnderlay } = this.props.colors;

    const sidebars = this.props.data.sidebars.map(sidebar => (
      <ChatThreadListSidebar
        {...sidebar}
        onPressItem={this.props.onPressItem}
        key={sidebar.threadInfo.id}
      />
    ));

    const lastActivity = shortAbsoluteDate(this.props.data.lastUpdatedTime);
    const unreadStyle = this.props.data.threadInfo.currentUser.unread
      ? this.props.styles.unread
      : null;
    return (
      <>
        <Swipeable renderRightActions={this.renderRightActions}>
          <Button
            onPress={this.onPress}
            iosFormat="highlight"
            iosHighlightUnderlayColor={listIosHighlightUnderlay}
            iosActiveOpacity={0.85}
          >
            <View style={this.props.styles.container}>
              <View style={this.props.styles.row}>
                <SingleLine style={[this.props.styles.threadName, unreadStyle]}>
                  {this.props.data.threadInfo.uiName}
                </SingleLine>
                <View style={this.props.styles.colorSplotch}>
                  <ColorSplotch
                    color={this.props.data.threadInfo.color}
                    size="small"
                  />
                </View>
              </View>
              <View style={this.props.styles.row}>
                {this.lastMessage()}
                <Text style={[this.props.styles.lastActivity, unreadStyle]}>
                  {lastActivity}
                </Text>
              </View>
            </View>
          </Button>
        </Swipeable>
        {sidebars}
      </>
    );
  }

  onPress = () => {
    this.props.onPressItem(this.props.data.threadInfo);
  };
}

const styles = {
  action: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    height: 60,
    flexDirection: 'row',
  },
  colorSplotch: {
    marginLeft: 10,
    marginTop: 2,
  },
  container: {
    height: 60,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    backgroundColor: 'listBackground',
  },
  lastActivity: {
    color: 'listForegroundTertiaryLabel',
    fontSize: 16,
    marginLeft: 10,
  },
  noMessages: {
    color: 'listForegroundTertiaryLabel',
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
    paddingLeft: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threadName: {
    color: 'listForegroundSecondaryLabel',
    flex: 1,
    fontSize: 20,
    paddingLeft: 10,
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
  windowWidth: state.dimensions.width,
}))(ChatThreadListItem);
