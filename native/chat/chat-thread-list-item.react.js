// @flow

import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { Text, View } from 'react-native';
import PropTypes from 'prop-types';
import Swipeable from '../components/swipeable';
import { useNavigation } from '@react-navigation/native';

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
  onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  currentlyOpenedSwipeableId?: string,
  // Redux state
  colors: Colors,
  styles: typeof styles,
};
function ChatThreadListItem({
  data,
  onPressItem,
  onSwipeableWillOpen,
  currentlyOpenedSwipeableId,
  colors,
  ...props
}: Props) {
  const swipeable = React.useRef<?Swipeable>();
  const navigation = useNavigation();

  React.useEffect(() => {
    return navigation.addListener('blur', () => {
      if (swipeable.current) {
        swipeable.current.close();
      }
    });
  }, [navigation, swipeable]);

  React.useEffect(() => {
    if (
      swipeable.current &&
      data.threadInfo.id !== currentlyOpenedSwipeableId
    ) {
      swipeable.current.close();
    }
  }, [currentlyOpenedSwipeableId, swipeable, data.threadInfo.id]);

  const lastMessage = React.useCallback(() => {
    const mostRecentMessageInfo = data.mostRecentMessageInfo;
    if (!mostRecentMessageInfo) {
      return (
        <Text style={props.styles.noMessages} numberOfLines={1}>
          No messages
        </Text>
      );
    }
    return (
      <MessagePreview
        messageInfo={mostRecentMessageInfo}
        threadInfo={data.threadInfo}
      />
    );
  }, [data.mostRecentMessageInfo, data.threadInfo, props.styles]);

  const sidebars = data.sidebars.map(sidebar => (
    <ChatThreadListSidebar
      {...sidebar}
      onPressItem={onPressItem}
      key={sidebar.threadInfo.id}
    />
  ));

  const onPress = React.useCallback(() => {
    onPressItem(data.threadInfo);
  }, [onPressItem, data.threadInfo]);

  const onSwipeableRightWillOpen = React.useCallback(() => {
    onSwipeableWillOpen(data.threadInfo);
  }, [onSwipeableWillOpen, data.threadInfo]);

  const lastActivity = shortAbsoluteDate(data.lastUpdatedTime);
  const unreadStyle = data.threadInfo.currentUser.unread
    ? props.styles.unread
    : null;
  return (
    <>
      <Swipeable
        buttonWidth={60}
        innerRef={swipeable}
        onSwipeableRightWillOpen={onSwipeableRightWillOpen}
        rightActions={[
          {
            key: 'action1',
            onPress: () => console.log('action1'),
            color: colors.greenButton,
            content: <Text>action1</Text>,
          },
          {
            key: 'action2',
            onPress: () => console.log('action2'),
            color: colors.redButton,
            content: <Text>action2</Text>,
          },
        ]}
      >
        <Button
          onPress={onPress}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <View style={props.styles.container}>
            <View style={props.styles.row}>
              <SingleLine style={[props.styles.threadName, unreadStyle]}>
                {data.threadInfo.uiName}
              </SingleLine>
              <View style={props.styles.colorSplotch}>
                <ColorSplotch color={data.threadInfo.color} size="small" />
              </View>
            </View>
            <View style={props.styles.row}>
              {lastMessage()}
              <Text style={[props.styles.lastActivity, unreadStyle]}>
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

ChatThreadListItem.propTypes = {
  data: chatThreadItemPropType.isRequired,
  onPressItem: PropTypes.func.isRequired,
  onSwipeableWillOpen: PropTypes.func.isRequired,
  currentlyOpenedSwipeableId: PropTypes.string,
  colors: colorsPropType.isRequired,
  styles: PropTypes.objectOf(PropTypes.object).isRequired,
};

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(ChatThreadListItem);
