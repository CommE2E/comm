// @flow

import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';

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
};
class ChatThreadListItem extends React.PureComponent<Props> {
  static propTypes = {
    data: chatThreadItemPropType.isRequired,
    onPressItem: PropTypes.func.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
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
        {sidebars}
      </>
    );
  }

  onPress = () => {
    this.props.onPressItem(this.props.data.threadInfo);
  };
}

const styles = {
  colorSplotch: {
    marginLeft: 10,
    marginTop: 2,
  },
  container: {
    height: 60,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
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
}))(ChatThreadListItem);
