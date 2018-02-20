// @flow

import type { EntryInfoWithHeight } from './calendar.react';
import {
  entryInfoPropType,
  type CreateEntryRequest,
  type SaveEntryRequest,
  type SaveEntryResponse,
  type DeleteEntryResponse,
} from 'lib/types/entry-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { NavigationParams, NavigationAction } from 'react-navigation';

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Alert,
  LayoutAnimation,
  Keyboard,
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import shallowequal from 'shallowequal';
import _omit from 'lodash/fp/omit';
import _isEqual from 'lodash/fp/isEqual';
import Icon from 'react-native-vector-icons/FontAwesome';
import { NavigationActions } from 'react-navigation';
import Hyperlink from 'react-native-hyperlink';

import { colorIsDark } from 'lib/shared/thread-utils';
import {
  currentSessionID,
  nextSessionID,
  sessionStartingPayload,
} from 'lib/selectors/session-selectors';
import {
  createEntryActionTypes,
  createEntry,
  saveEntryActionTypes,
  saveEntry,
  deleteEntryActionTypes,
  deleteEntry,
  concurrentModificationResetActionType,
} from 'lib/actions/entry-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { ServerError } from 'lib/utils/fetch-utils';
import { entryKey } from 'lib/shared/entry-utils';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { dateString } from 'lib/utils/date-utils';

import Button from '../components/button.react';
import { ChatRouteName } from '../chat/chat.react';
import { MessageListRouteName } from '../chat/message-list.react';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
} from '../utils/navigation-utils';

type Props = {
  entryInfo: EntryInfoWithHeight,
  visible: bool,
  focused: bool,
  onFocus: (entryKey: string, focused: bool) => void,
  navigate: (
    routeName: string,
    params?: NavigationParams,
    action?: NavigationAction,
  ) => bool,
  entryRef: (entryKey: string, entry: ?InternalEntry) => void,
  // Redux state
  threadInfo: ThreadInfo,
  sessionStartingPayload: () => { newSessionID?: string },
  sessionID: () => string,
  nextSessionID: () => ?string,
  currentChatThreadID: ?string,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  createEntry: (request: CreateEntryRequest) => Promise<SaveEntryResponse>,
  saveEntry: (request: SaveEntryRequest) => Promise<SaveEntryResponse>,
  deleteEntry: (
    entryID: string,
    prevText: string,
    sessionID: string,
  ) => Promise<DeleteEntryResponse>,
};
type State = {
  text: string,
  loadingStatus: LoadingStatus,
  height: number,
  threadInfo: ThreadInfo,
};
class InternalEntry extends React.Component<Props, State> {
  
  static propTypes = {
    entryInfo: entryInfoPropType.isRequired,
    visible: PropTypes.bool.isRequired,
    focused: PropTypes.bool.isRequired,
    onFocus: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    sessionStartingPayload: PropTypes.func.isRequired,
    sessionID: PropTypes.func.isRequired,
    nextSessionID: PropTypes.func.isRequired,
    currentChatThreadID: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    createEntry: PropTypes.func.isRequired,
    saveEntry: PropTypes.func.isRequired,
    deleteEntry: PropTypes.func.isRequired,
  };
  textInput: ?TextInput;
  creating = false;
  needsUpdateAfterCreation = false;
  needsDeleteAfterCreation = false;
  nextSaveAttemptIndex = 0;
  mounted = false;
  deleted = false;
  currentlySaving: ?string;

  constructor(props: Props) {
    super(props);
    invariant(props.threadInfo, "should be set");
    this.state = {
      text: props.entryInfo.text,
      loadingStatus: "inactive",
      height: props.entryInfo.textHeight + 10,
      // On log out, it's possible for the thread to be deauthorized before
      // the log out animation completes. To avoid having rendering issues in
      // that case, we cache the threadInfo in state and don't reset it when the
      // threadInfo is undefined.
      threadInfo: props.threadInfo,
    };
  }

  guardedSetState(input: $Shape<State>) {
    if (this.mounted) {
      this.setState(input);
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      !InternalEntry.isFocused(nextProps) &&
      (nextProps.entryInfo.text !== this.props.entryInfo.text &&
        nextProps.entryInfo.text !== this.state.text) ||
      (nextProps.entryInfo.textHeight !== this.props.entryInfo.textHeight &&
        nextProps.entryInfo.textHeight !== (this.state.height - 10))
    ) {
      this.setState({
        text: nextProps.entryInfo.text,
        height: nextProps.entryInfo.textHeight + 10,
      });
    }
    if (
      nextProps.threadInfo &&
      !_isEqual(nextProps.threadInfo)(this.state.threadInfo)
    ) {
      this.setState({ threadInfo: nextProps.threadInfo });
    }
    if (!nextProps.focused && this.props.focused) {
      if (this.textInput) {
        this.textInput.blur();
      }
      this.onBlur();
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    const omitEntryInfo = _omit(["entryInfo"]);
    return !shallowequal(nextState, this.state) ||
      !shallowequal(omitEntryInfo(nextProps), omitEntryInfo(this.props)) ||
      !_isEqual(nextProps.entryInfo)(this.props.entryInfo);
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (
      nextState.height !== this.state.height ||
      InternalEntry.isFocused(nextProps) !== InternalEntry.isFocused(this.props)
    ) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  componentDidMount() {
    this.mounted = true;
    this.props.entryRef(entryKey(this.props.entryInfo), this);
  }

  componentWillUnmount() {
    this.mounted = false;
    this.props.entryRef(entryKey(this.props.entryInfo), null);
  }

  static isFocused(props: Props) {
    return props.focused || !props.entryInfo.id;
  }

  render() {
    const focused = InternalEntry.isFocused(this.props);

    const darkColor = colorIsDark(this.state.threadInfo.color);
    let actionLinks = null;
    if (focused) {
      const actionLinksColor = darkColor ? '#D3D3D3' : '#808080';
      const actionLinksTextStyle = { color: actionLinksColor };
      const actionLinksUnderlayColor = darkColor ? "#AAAAAA88" : "#CCCCCCDD";
      actionLinks = (
        <View style={styles.actionLinks}>
          <View style={styles.leftLinks}>
            <Button
              onPress={this.onPressDelete}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={styles.button}
            >
              <View style={styles.deleteButtonContents}>
                <Icon
                  name="close"
                  size={14}
                  color={actionLinksColor}
                />
                <Text style={[styles.leftLinksText, actionLinksTextStyle]}>
                  DELETE
                </Text>
              </View>
            </Button>
          </View>
          <View style={styles.rightLinks}>
            <Button
              onPress={this.onPressThreadName}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={styles.button}
            >
              <Text
                style={[styles.rightLinksText, actionLinksTextStyle]}
                numberOfLines={1}
              >
                {this.state.threadInfo.uiName}
              </Text>
            </Button>
          </View>
        </View>
      );
    }
    const entryStyle = { backgroundColor: `#${this.state.threadInfo.color}` };
    const textStyle = {
      color: darkColor ? 'white' : 'black',
      height: this.state.height,
    };
    let text;
    if (this.props.visible || focused) {
      text = (
        <TextInput
          style={[styles.text, textStyle]}
          underlineColorAndroid="transparent"
          value={this.state.text}
          onChangeText={this.onChangeText}
          multiline={true}
          onBlur={this.onBlur}
          onFocus={this.onFocus}
          onContentSizeChange={this.onContentSizeChange}
          ref={this.textInputRef}
        />
      );
    } else {
      const linkStyle = darkColor ? styles.lightLinkText : styles.darkLinkText;
      text = (
        <Hyperlink linkDefault={true} linkStyle={linkStyle}>
          <Text style={[styles.text, textStyle]}>
            {this.state.text}
          </Text>
        </Hyperlink>
      );
    }
    let entry;
    if (Platform.OS === "ios") {
      // On iOS, we can take the capture away from our child TextInput and
      // everything still works properly - the keyboard pops open and cursor
      // appears where the TextInput was pressed. Hooking in here allows us to
      // speed up our response times to TextInput presses (as onFocus is
      // painfully slow). On Android, the response time to TextInput onFocus is
      // faster anyways, and plus stealing the capture here causes problems.
      entry = (
        <View
          style={[styles.entry, entryStyle]}
          onStartShouldSetResponderCapture={this.onStartShouldSetResponderCapture}
          onResponderGrant={this.onFocus}
          onResponderTerminationRequest={this.onResponderTerminationRequest}
          onResponderTerminate={this.onResponderTerminate}
        >
          {text}
          {actionLinks}
        </View>
      );
    } else {
      entry = (
        <View style={[styles.entry, entryStyle]}>
          {text}
          {actionLinks}
        </View>
      );
    }
    return <View style={styles.container}>{entry}</View>;
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
    if (textInput && InternalEntry.isFocused(this.props)) {
      setTimeout(textInput.focus, 400);
    }
  }

  onFocus = () => this.props.onFocus(entryKey(this.props.entryInfo), true);

  onStartShouldSetResponderCapture = (
    event: { nativeEvent: { pageY: number } },
  ) => event.nativeEvent.pageY < this.state.height + 5;

  onResponderTerminationRequest = () => true;

  onResponderTerminate =
    () => this.props.onFocus(entryKey(this.props.entryInfo), false);

  onBlur = () => {
    if (this.state.text.trim() === "") {
      this.delete(this.props.entryInfo.id);
    } else if (this.props.entryInfo.text !== this.state.text) {
      this.save(this.props.entryInfo.id, this.state.text);
    }
    this.props.onFocus(entryKey(this.props.entryInfo), false);
  }

  saveFromInputBar = () => {
    this.save(this.props.entryInfo.id, this.state.text);
    this.props.onFocus(entryKey(this.props.entryInfo), false);
  }

  onContentSizeChange = (
    event: { nativeEvent: { contentSize: { height: number }}},
  ) => {
    if (!InternalEntry.isFocused(this.props)) {
      return;
    }
    let height = event.nativeEvent.contentSize.height;
    // iOS doesn't include the margin on this callback
    height = Platform.OS === "ios" ? height + 10 : height + 5;
    this.guardedSetState({ height });
  }

  onChangeText = (newText: string) => {
    this.guardedSetState({ text: newText });
  }

  save(serverID: ?string, newText: string) {
    if (this.currentlySaving === newText) {
      return;
    }
    this.currentlySaving = newText;

    if (newText.trim() === "") {
      // We don't save the empty string, since as soon as the element loses
      // focus it'll get deleted
      return;
    }

    if (!serverID) {
      if (this.creating) {
        // We need the first save call to return so we know the ID of the entry
        // we're updating, so we'll need to handle this save later
        this.needsUpdateAfterCreation = true;
        return;
      } else {
        this.creating = true;
      }
    }

    const startingPayload = this.props.sessionStartingPayload();
    if (!serverID) {
      this.props.dispatchActionPromise(
        createEntryActionTypes,
        this.createAction(newText),
        undefined,
        startingPayload,
      );
    } else {
      this.props.dispatchActionPromise(
        saveEntryActionTypes,
        this.saveAction(serverID, newText),
        undefined,
        startingPayload,
      );
    }
  }

  async createAction(text: string) {
    const localID = this.props.entryInfo.localID;
    invariant(localID, "if there's no serverID, there should be a localID");
    const curSaveAttempt = this.nextSaveAttemptIndex++;
    this.guardedSetState({ loadingStatus: "loading" });
    try {
      const response = await this.props.createEntry({
        text,
        sessionID: this.props.sessionID(),
        timestamp: this.props.entryInfo.creationTime,
        date: dateString(
          this.props.entryInfo.year,
          this.props.entryInfo.month,
          this.props.entryInfo.day,
        ),
        threadID: this.props.entryInfo.threadID,
      });
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "inactive" });
      }
      this.creating = false;
      if (this.needsUpdateAfterCreation) {
        this.needsUpdateAfterCreation = false;
        this.save(response.entryID, this.state.text);
      }
      if (this.needsDeleteAfterCreation) {
        this.needsDeleteAfterCreation = false;
        this.delete(response.entryID);
      }
      return { ...response, localID };
    } catch(e) {
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "error" });
      }
      throw e;
    }
  }

  async saveAction(entryID: string, newText: string) {
    const curSaveAttempt = this.nextSaveAttemptIndex++;
    this.guardedSetState({ loadingStatus: "loading" });
    try {
      const response = await this.props.saveEntry({
        entryID,
        text: newText,
        prevText: this.props.entryInfo.text,
        sessionID: this.props.sessionID(),
        timestamp: Date.now(),
      });
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "inactive" });
      }
      return { ...response, threadID: this.props.entryInfo.threadID };
    } catch(e) {
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "error" });
      }
      if (e instanceof ServerError && e.message === 'concurrent_modification') {
        const onRefresh = () => {
          this.guardedSetState({ loadingStatus: "inactive" });
          this.props.dispatchActionPayload(
            concurrentModificationResetActionType,
            { id: entryID, dbText: e.result.db },
          );
        };
        Alert.alert(
          "Concurrent modification",
          "It looks like somebody is attempting to modify that field at the " +
            "same time as you! Please refresh the entry and try again.",
          [
            { text: 'OK', onPress: onRefresh },
          ],
          { cancelable: false },
        );
      }
      throw e;
    }
  }

  onPressDelete = () => {
    this.delete(this.props.entryInfo.id);
  }

  delete(serverID: ?string) {
    if (this.deleted) {
      return;
    }
    this.deleted = true;
    LayoutAnimation.easeInEaseOut();
    const startingPayload: {[key: string]: ?string} = {
      localID: this.props.entryInfo.localID,
      serverID: serverID,
    };
    const nextSessionID = this.props.nextSessionID();
    if (nextSessionID) {
      startingPayload.newSessionID = nextSessionID;
    }
    this.props.dispatchActionPromise(
      deleteEntryActionTypes,
      this.deleteAction(serverID),
      undefined,
      startingPayload,
    );
  }

  async deleteAction(serverID: ?string) {
    if (serverID) {
      return await this.props.deleteEntry(
        serverID,
        this.props.entryInfo.text,
        this.props.sessionID(),
      );
    } else if (this.creating) {
      this.needsDeleteAfterCreation = true;
    }
    return null;
  }

  onPressThreadName = () => {
    Keyboard.dismiss();
    if (this.props.currentChatThreadID === this.props.threadInfo.id) {
      this.props.navigate(ChatRouteName);
      return;
    }
    this.props.navigate(
      ChatRouteName,
      {},
      NavigationActions.navigate({
        routeName: MessageListRouteName,
        params: {
          threadInfo: this.props.threadInfo,
        },
      })
    );
  }

}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  entry: {
    borderRadius: 8,
    margin: 5,
    overflow: 'hidden',
  },
  text: {
    fontSize: 16,
    paddingTop: 5,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 1,
    color: '#333333',
    fontFamily: 'Arial',
  },
  actionLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },
  deleteButtonContents: {
    flex: 1,
    flexDirection: 'row',
  },
  leftLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  leftLinksText: {
    paddingLeft: 5,
    fontWeight: 'bold',
    fontSize: 12,
  },
  rightLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rightLinksText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  darkLinkText: {
    color: "#036AFF",
    textDecorationLine: "underline",
  },
  lightLinkText: {
    color: "#129AFF",
    textDecorationLine: "underline",
  },
});

registerFetchKey(saveEntryActionTypes);
registerFetchKey(deleteEntryActionTypes);

const Entry = connect(
  (state: AppState, ownProps: { entryInfo: EntryInfoWithHeight }) => {
    const appRoute =
      assertNavigationRouteNotLeafNode(state.navInfo.navigationState.routes[0]);
    const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);
    const currentChatSubroute = chatRoute.routes[chatRoute.index];
    const currentChatThreadID =
      currentChatSubroute.routeName === MessageListRouteName
        ? getThreadIDFromParams(currentChatSubroute)
        : null;
    return {
      threadInfo: threadInfoSelector(state)[ownProps.entryInfo.threadID],
      sessionStartingPayload: sessionStartingPayload(state),
      sessionID: currentSessionID(state),
      nextSessionID: nextSessionID(state),
      currentChatThreadID,
      cookie: state.cookie,
    };
  },
  includeDispatchActionProps,
  bindServerCalls({ createEntry, saveEntry, deleteEntry }),
)(InternalEntry);

export {
  InternalEntry,
  Entry,
};
