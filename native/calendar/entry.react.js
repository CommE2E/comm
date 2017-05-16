// @flow

import type { EntryInfoWithHeight } from './calendar.react';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { AppState } from '../redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { SaveResult } from 'lib/actions/entry-actions';
import type { LoadingStatus } from 'lib/types/loading-types';

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import shallowequal from 'shallowequal';
import _omit from 'lodash/fp/omit';
import _isEqual from 'lodash/fp/isEqual';

import { colorIsDark } from 'lib/selectors/calendar-selectors';
import {
  currentSessionID,
  nextSessionID,
  sessionStartingPayload,
} from 'lib/selectors/session-selectors';
import {
  saveEntryActionType,
  saveEntry,
  deleteEntryActionType,
  deleteEntry,
  concurrentModificationResetActionType,
} from 'lib/actions/entry-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { ServerError } from 'lib/utils/fetch-utils';

type Props = {
  entryInfo: EntryInfoWithHeight,
  // Redux state
  calendarInfo: CalendarInfo,
  sessionStartingPayload: () => { newSessionID?: string },
  sessionID: () => string,
  nextSessionID: () => ?string,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  saveEntry: (
    serverID: ?string,
    newText: string,
    prevText: string,
    sessionID: string,
    year: number,
    month: number,
    day: number,
    calendarID: string,
    creationTime: number,
  ) => Promise<SaveResult>,
  deleteEntry: (
    serverID: string,
    prevText: string,
    sessionID: string,
  ) => Promise<void>,
};
type State = {
  text: string,
  loadingStatus: LoadingStatus,
  focused: bool,
  height: number,
  color: string,
};
class Entry extends React.Component {
  
  props: Props;
  state: State;
  static propTypes = {
    entryInfo: entryInfoPropType.isRequired,
    calendarInfo: calendarInfoPropType.isRequired,
    sessionStartingPayload: PropTypes.func.isRequired,
    sessionID: PropTypes.func.isRequired,
    nextSessionID: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    saveEntry: PropTypes.func.isRequired,
    deleteEntry: PropTypes.func.isRequired,
  };
  textInput: ?TextInput;
  creating = false;
  needsUpdateAfterCreation = false;
  needsDeleteAfterCreation = false;
  nextSaveAttemptIndex = 0;
  mounted = true;

  constructor(props: Props) {
    super(props);
    invariant(props.calendarInfo, "should be set");
    this.state = {
      text: props.entryInfo.text,
      loadingStatus: "inactive",
      focused: false,
      height: props.entryInfo.textHeight + 10,
      // On log out, it's possible for the calendar to be deauthorized before
      // the log out animation completes. To avoid having rendering issues in
      // that case, we cache the color in state and don't reset it when the
      // calendarInfo is undefined.
      color: props.calendarInfo.color,
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      !this.state.focused &&
      nextProps.entryInfo.text !== this.props.entryInfo.text &&
      nextProps.entryInfo.text !== this.state.text
    ) {
      this.setState({
        text: nextProps.entryInfo.text,
        height: nextProps.entryInfo.textHeight + 10,
      });
    }
    if (
      nextProps.calendarInfo &&
      nextProps.calendarInfo.color !== this.state.color
    ) {
      this.setState({ color: nextProps.calendarInfo.color });
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    const omitEntryInfo = _omit(["entryInfo"]);
    return !shallowequal(nextState, this.state) ||
      !shallowequal(omitEntryInfo(nextProps), omitEntryInfo(this.props)) ||
      !_isEqual(nextProps.entryInfo, this.props.entryInfo);
  }

  componentDidMount() {
    // Whenever a new Entry is created, focus on it
    if (!this.props.entryInfo.id) {
      invariant(this.textInput, "textInput ref not set");
      this.textInput.focus();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    const containerStyle = {
      height: this.state.height + 10,
    };
    const entryStyle = {
      backgroundColor: `#${this.state.color}`,
      height: this.state.height,
    };
    const textColor = colorIsDark(this.state.color) ? 'white' : 'black';
    const textStyle = { color: textColor };
    const textInputStyle = { color: textColor, height: this.state.height };
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={[styles.entry, entryStyle]}>
          <TextInput
            style={[styles.textInput, textInputStyle]}
            underlineColorAndroid="transparent"
            value={this.state.text}
            onChangeText={this.onChangeText}
            multiline={true}
            onBlur={this.onBlur}
            onFocus={this.onFocus}
            onContentSizeChange={this.onContentSizeChange}
            onChange={this.onChange}
            ref={this.textInputRef}
          />
        </View>
      </View>
    );
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
  }

  onFocus = () => {
    this.setState({ focused: true });
  }

  onBlur = (event: SyntheticEvent) => {
    this.setState({ focused: false });
    if (this.state.text.trim() === "") {
      this.delete(this.props.entryInfo.id);
    } else if (this.props.entryInfo.text !== this.state.text) {
      this.save(this.props.entryInfo.id, this.state.text);
    }
  }

  onContentSizeChange = (event) => {
    if (!this.state.focused) {
      return;
    }
    let height = event.nativeEvent.contentSize.height;
    // iOS doesn't include the margin on this callback
    height = Platform.OS === "ios" ? height + 10 : height;
    this.setState({ height });
  }

  // On around, onContentSizeChange only gets called once when the TextInput is
  // first rendered. Which is like, what? Anyways, instead you're supposed to
  // use onChange.
  onChange = (event) => {
    if (!this.state.focused) {
      return;
    }
    this.setState({ height: event.nativeEvent.contentSize.height });
  }

  onChangeText = (newText: string) => {
    this.setState({ text: newText });
  }

  save(serverID: ?string, newText: string) {
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
    this.props.dispatchActionPromise(
      saveEntryActionType,
      this.saveAction(serverID, newText),
      undefined,
      startingPayload,
    );
  }

  async saveAction(serverID: ?string, newText: string) {
    const curSaveAttempt = this.nextSaveAttemptIndex++;
    if (this.mounted) {
      this.setState({ loadingStatus: "loading" });
    }
    try {
      const response = await this.props.saveEntry(
        serverID,
        newText,
        this.props.entryInfo.text,
        this.props.sessionID(),
        this.props.entryInfo.year,
        this.props.entryInfo.month,
        this.props.entryInfo.day,
        this.props.entryInfo.calendarID,
        this.props.entryInfo.creationTime,
      );
      if (this.mounted && curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.setState({ loadingStatus: "inactive" });
      }
      const payload = {
        localID: (null: ?string),
        serverID: serverID,
        text: newText,
      }
      if (!serverID && response.entry_id) {
        const newServerID = response.entry_id.toString();
        payload.serverID = newServerID;
        const localID = this.props.entryInfo.localID;
        invariant(localID, "if there's no serverID, there should be a localID");
        payload.localID = localID;
        this.creating = false;
        if (this.needsUpdateAfterCreation) {
          this.needsUpdateAfterCreation = false;
          this.save(newServerID, this.state.text);
        }
        if (this.needsDeleteAfterCreation) {
          this.needsDeleteAfterCreation = false;
          this.delete(newServerID);
        }
      }
      return payload;
    } catch(e) {
      if (this.mounted && curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.setState({ loadingStatus: "error" });
      }
      if (e instanceof ServerError && e.message === 'concurrent_modification') {
        const onRefresh = () => {
          this.setState({ loadingStatus: "inactive" });
          this.props.dispatchActionPayload(
            concurrentModificationResetActionType,
            { id: serverID, dbText: e.result.db },
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

  delete(serverID: ?string) {
    const startingPayload: {[key: string]: ?string} = {
      localID: this.props.entryInfo.localID,
      serverID: serverID,
    };
    const nextSessionID = this.props.nextSessionID();
    if (nextSessionID) {
      startingPayload.newSessionID = nextSessionID;
    }
    this.props.dispatchActionPromise(
      deleteEntryActionType,
      this.deleteAction(serverID),
      undefined,
      startingPayload,
    );
  }

  async deleteAction(serverID: ?string) {
    if (serverID) {
      await this.props.deleteEntry(
        serverID,
        this.props.entryInfo.text,
        this.props.sessionID(),
      );
    } else if (this.creating) {
      this.needsDeleteAfterCreation = true;
    }
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
  textInput: {
    fontSize: 16,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    margin: 0,
    color: '#333333',
    fontFamily: 'Arial',
  },
});

export default connect(
  (state: AppState, ownProps: { entryInfo: EntryInfoWithHeight }) => ({
    calendarInfo: state.calendarInfos[ownProps.entryInfo.calendarID],
    sessionStartingPayload: sessionStartingPayload(state),
    sessionID: currentSessionID(state),
    nextSessionID: nextSessionID(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps({
    dispatchActionPayload: true,
    dispatchActionPromise: true,
  }),
  bindServerCalls({ saveEntry, deleteEntry }),
)(Entry);
