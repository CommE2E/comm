// @flow

import type { EntryInfoWithHeight } from './calendar.react';
import {
  entryInfoPropType,
  type CreateEntryInfo,
  type SaveEntryInfo,
  type SaveEntryResponse,
  type DeleteEntryInfo,
  type DeleteEntryResponse,
  type CalendarQuery,
} from 'lib/types/entry-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import type {
  NavigationParams,
  NavigationNavigateAction,
} from 'react-navigation';

import * as React from 'react';
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
  InteractionManager,
} from 'react-native';
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
  createEntryActionTypes,
  createEntry,
  saveEntryActionTypes,
  saveEntry,
  deleteEntryActionTypes,
  deleteEntry,
  concurrentModificationResetActionType,
} from 'lib/actions/entry-actions';
import { connect } from 'lib/utils/redux-utils';
import { ServerError } from 'lib/utils/errors';
import { entryKey } from 'lib/shared/entry-utils';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { dateString } from 'lib/utils/date-utils';
import { nonThreadCalendarQuery } from 'lib/selectors/nav-selectors';

import Button from '../components/button.react';
import { ChatRouteName } from '../chat/chat.react';
import { MessageListRouteName } from '../chat/message-list.react';

type Props = {
  entryInfo: EntryInfoWithHeight,
  visible: bool,
  active: bool,
  makeActive: (entryKey: string, active: bool) => void,
  onEnterEditMode: (entryInfo: EntryInfoWithHeight) => void,
  navigate: ({
    routeName: string,
    params?: NavigationParams,
    action?: NavigationNavigateAction,
    key?: string,
  }) => bool,
  onPressWhitespace: () => void,
  entryRef: (entryKey: string, entry: ?InternalEntry) => void,
  // Redux state
  threadInfo: ThreadInfo,
  sessionID: string,
  calendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  createEntry: (info: CreateEntryInfo) => Promise<SaveEntryResponse>,
  saveEntry: (info: SaveEntryInfo) => Promise<SaveEntryResponse>,
  deleteEntry: (info: DeleteEntryInfo) => Promise<DeleteEntryResponse>,
};
type State = {|
  editing: bool,
  text: string,
  loadingStatus: LoadingStatus,
  height: number,
  threadInfo: ThreadInfo,
|};
class InternalEntry extends React.Component<Props, State> {
  
  static propTypes = {
    entryInfo: entryInfoPropType.isRequired,
    visible: PropTypes.bool.isRequired,
    active: PropTypes.bool.isRequired,
    makeActive: PropTypes.func.isRequired,
    onEnterEditMode: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
    onPressWhitespace: PropTypes.func.isRequired,
    entryRef: PropTypes.func.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    sessionID: PropTypes.string.isRequired,
    calendarQuery: PropTypes.func.isRequired,
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
      editing: InternalEntry.isActive(props),
      text: props.entryInfo.text,
      loadingStatus: "inactive",
      height: props.entryInfo.textHeight,
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
    const wasActive = InternalEntry.isActive(this.props);
    const willBeActive = InternalEntry.isActive(nextProps);
    if (
      !willBeActive &&
      (nextProps.entryInfo.text !== this.props.entryInfo.text &&
        nextProps.entryInfo.text !== this.state.text) ||
      (nextProps.entryInfo.textHeight !== this.props.entryInfo.textHeight &&
        nextProps.entryInfo.textHeight !== this.state.height)
    ) {
      this.guardedSetState({
        text: nextProps.entryInfo.text,
        height: nextProps.entryInfo.textHeight,
      });
    }
    if (
      nextProps.threadInfo &&
      !_isEqual(nextProps.threadInfo)(this.state.threadInfo)
    ) {
      this.guardedSetState({ threadInfo: nextProps.threadInfo });
    }
    if (!nextProps.active && wasActive && this.textInput) {
      this.textInput.blur();
      this.completeEdit();
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    const omitEntryInfo = _omit(["entryInfo"]);
    return !shallowequal(nextState, this.state) ||
      !shallowequal(omitEntryInfo(nextProps), omitEntryInfo(this.props)) ||
      !_isEqual(nextProps.entryInfo)(this.props.entryInfo);
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    const wasActive = InternalEntry.isActive(this.props);
    const willBeActive = InternalEntry.isActive(nextProps);
    const wasEditing = InternalEntry.isEditing(this.props, this.state);
    const willBeEditing = InternalEntry.isEditing(nextProps, nextState);
    if (!willBeEditing && wasEditing && this.textInput) {
      this.textInput.blur();
    }
    if (nextState.height !== this.state.height || willBeActive !== wasActive) {
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

  static isActive(props: Props) {
    return props.active || !props.entryInfo.id;
  }

  static isEditing(props: Props, state: State) {
    return (props.active && state.editing) || !props.entryInfo.id;
  }

  render() {
    const active = InternalEntry.isActive(this.props);
    const editing = InternalEntry.isEditing(this.props, this.state);

    const darkColor = colorIsDark(this.state.threadInfo.color);
    let actionLinks = null;
    if (active) {
      const actionLinksColor = darkColor ? '#D3D3D3' : '#404040';
      const actionLinksTextStyle = { color: actionLinksColor };
      const actionLinksUnderlayColor = darkColor ? "#AAAAAA88" : "#CCCCCCDD";
      let editButtonContent;
      if (editing) {
        editButtonContent = (
          <React.Fragment>
            <Icon
              name="check"
              size={14}
              color={actionLinksColor}
            />
            <Text style={[styles.leftLinksText, actionLinksTextStyle]}>
              SAVE
            </Text>
          </React.Fragment>
        );
      } else {
        editButtonContent = (
          <React.Fragment>
            <Icon
              name="pencil"
              size={12}
              color={actionLinksColor}
              style={styles.pencilIcon}
            />
            <Text style={[styles.leftLinksText, actionLinksTextStyle]}>
              EDIT
            </Text>
          </React.Fragment>
        );
      }
      actionLinks = (
        <View style={styles.actionLinks}>
          <View style={styles.leftLinks}>
            <Button
              onPress={this.delete}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={styles.button}
            >
              <View style={styles.buttonContents}>
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
            <Button
              onPress={this.onPressEdit}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={styles.button}
            >
              <View style={styles.buttonContents}>
                {editButtonContent}
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

    const textColor = darkColor ? 'white' : 'black';
    let textInput;
    if (editing) {
      const textInputStyle = {
        color: textColor,
        backgroundColor: `#${this.state.threadInfo.color}`,
      };
      const selectionColor = darkColor ? '#129AFF' : '#036AFF';
      textInput = (
        <TextInput
          style={[styles.textInput, textInputStyle]}
          underlineColorAndroid="transparent"
          value={this.state.text}
          onChangeText={this.onChangeText}
          multiline={true}
          onBlur={this.onBlur}
          selectionColor={selectionColor}
          ref={this.textInputRef}
        />
      );
    }

    let rawText = this.state.text;
    if (rawText === "" || rawText.slice(-1) === "\n") {
      rawText += " ";
    }
    const textStyle = { color: textColor };
    const linkStyle = darkColor ? styles.lightLinkText : styles.darkLinkText;
    // We use an empty View to set the height of the entry, and then position
    // the Text and TextInput absolutely. This allows to measure height changes
    // to the Text while controlling the actual height of the entry.
    const heightStyle = { height: this.state.height };
    const entryStyle = { backgroundColor: `#${this.state.threadInfo.color}` };
    const opacity = editing ? 1.0 : 0.6;
    return (
      <TouchableWithoutFeedback onPress={this.props.onPressWhitespace}>
        <View style={styles.container}>
          <Button
            onPress={this.setActive}
            style={[styles.entry, entryStyle]}
            androidFormat="opacity"
            iosActiveOpacity={opacity}
          >
            <View>
              <View style={heightStyle} />
              <Hyperlink
                linkDefault={true}
                linkStyle={linkStyle}
                style={styles.textContainer}
              >
                <Text
                  style={[styles.text, textStyle]}
                  onLayout={this.onTextLayout}
                >
                  {rawText}
                </Text>
              </Hyperlink>
              {textInput}
            </View>
            {actionLinks}
          </Button>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
    if (textInput && InternalEntry.isEditing(this.props, this.state)) {
      this.enterEditMode(textInput);
    }
  }

  enterEditMode = (textInput: TextInput) => {
    this.setActive();
    this.props.onEnterEditMode(this.props.entryInfo);
    // For some reason if we don't do this the keyboard immediately dismisses
    // after focus
    InteractionManager.runAfterInteractions(() => {
      setTimeout(textInput.focus);
    });
  }

  setActive = () => this.props.makeActive(entryKey(this.props.entryInfo), true);

  completeEdit = () => {
    this.onBlur();
    this.guardedSetState({ editing: false });
    this.props.makeActive(entryKey(this.props.entryInfo), false);
  }

  onBlur = () => {
    if (this.state.text.trim() === "") {
      this.delete();
    } else if (this.props.entryInfo.text !== this.state.text) {
      this.save();
    }
  }

  save = () => {
    this.dispatchSave(this.props.entryInfo.id, this.state.text);
  }

  onTextLayout = (
    event: { nativeEvent: { layout: { height: number }}},
  ) => {
    this.guardedSetState({
      height: Math.ceil(event.nativeEvent.layout.height),
    });
  }

  onChangeText = (newText: string) => {
    this.guardedSetState({ text: newText });
  }

  dispatchSave(serverID: ?string, newText: string) {
    if (this.currentlySaving === newText) {
      return;
    }
    this.currentlySaving = newText;

    if (newText.trim() === "") {
      // We don't save the empty string, since as soon as the element becomes
      // inactive it'll get deleted
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

    if (!serverID) {
      this.props.dispatchActionPromise(
        createEntryActionTypes,
        this.createAction(newText),
      );
    } else {
      this.props.dispatchActionPromise(
        saveEntryActionTypes,
        this.saveAction(serverID, newText),
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
        sessionID: this.props.sessionID,
        timestamp: this.props.entryInfo.creationTime,
        date: dateString(
          this.props.entryInfo.year,
          this.props.entryInfo.month,
          this.props.entryInfo.day,
        ),
        threadID: this.props.entryInfo.threadID,
        calendarQuery: this.props.calendarQuery(),
      });
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "inactive" });
      }
      this.creating = false;
      if (this.needsUpdateAfterCreation) {
        this.needsUpdateAfterCreation = false;
        this.dispatchSave(response.entryID, this.state.text);
      }
      if (this.needsDeleteAfterCreation) {
        this.needsDeleteAfterCreation = false;
        this.dispatchDelete(response.entryID);
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
        sessionID: this.props.sessionID,
        timestamp: Date.now(),
        calendarQuery: this.props.calendarQuery(),
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
            { id: entryID, dbText: e.payload.db },
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

  delete = () => {
    this.dispatchDelete(this.props.entryInfo.id);
  }

  onPressEdit = () => {
    if (InternalEntry.isEditing(this.props, this.state)) {
      this.completeEdit();
    } else {
      this.guardedSetState({ editing: true });
    }
  }

  dispatchDelete(serverID: ?string) {
    if (this.deleted) {
      return;
    }
    this.deleted = true;
    LayoutAnimation.easeInEaseOut();
    const { localID } = this.props.entryInfo;
    this.props.dispatchActionPromise(
      deleteEntryActionTypes,
      this.deleteAction(serverID),
      undefined,
      { localID, serverID },
    );
  }

  async deleteAction(serverID: ?string) {
    if (serverID) {
      return await this.props.deleteEntry({
        entryID: serverID,
        prevText: this.props.entryInfo.text,
        sessionID: this.props.sessionID,
        calendarQuery: this.props.calendarQuery(),
      });
    } else if (this.creating) {
      this.needsDeleteAfterCreation = true;
    }
    return null;
  }

  onPressThreadName = () => {
    Keyboard.dismiss();
    const threadInfo = this.props.threadInfo;
    this.props.navigate({
      routeName: ChatRouteName,
      params: {},
      action: NavigationActions.navigate({
        routeName: MessageListRouteName,
        params: { threadInfo },
        key: `${MessageListRouteName}${threadInfo.id}`,
      }),
    });
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
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    color: '#333333',
    fontFamily: 'Arial',
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    padding: 0,
    margin: 0,
  },
  textInput: {
    position: 'absolute',
    top: Platform.OS === "android" ? 5 : 0,
    left: 10,
    right: 10,
    padding: 0,
    margin: 0,
    fontSize: 16,
    fontFamily: 'Arial',
  },
  actionLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },
  buttonContents: {
    flex: 1,
    flexDirection: 'row',
  },
  leftLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 5,
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
    paddingHorizontal: 5,
  },
  rightLinksText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  button: {
    padding: 5,
  },
  darkLinkText: {
    color: "#036AFF",
    textDecorationLine: "underline",
  },
  lightLinkText: {
    color: "#129AFF",
    textDecorationLine: "underline",
  },
  pencilIcon: {
    paddingTop: 1,
  },
});

registerFetchKey(saveEntryActionTypes);
registerFetchKey(deleteEntryActionTypes);

const Entry = connect(
  (state: AppState, ownProps: { entryInfo: EntryInfoWithHeight }) => ({
    threadInfo: threadInfoSelector(state)[ownProps.entryInfo.threadID],
    sessionID: state.sessionID,
    calendarQuery: nonThreadCalendarQuery(state),
  }),
  { createEntry, saveEntry, deleteEntry },
)(InternalEntry);

export {
  InternalEntry,
  Entry,
  styles as entryStyles,
};
