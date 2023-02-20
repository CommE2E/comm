// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import _omit from 'lodash/fp/omit.js';
import * as React from 'react';
import {
  View,
  Text,
  TextInput as BaseTextInput,
  Platform,
  TouchableWithoutFeedback,
  Alert,
  LayoutAnimation,
  Keyboard,
} from 'react-native';
import { useDispatch } from 'react-redux';
import shallowequal from 'shallowequal';
import tinycolor from 'tinycolor2';

import {
  createEntryActionTypes,
  createEntry,
  saveEntryActionTypes,
  saveEntry,
  deleteEntryActionTypes,
  deleteEntry,
  concurrentModificationResetActionType,
} from 'lib/actions/entry-actions.js';
import { registerFetchKey } from 'lib/reducers/loading-reducer.js';
import { entryKey } from 'lib/shared/entry-utils.js';
import { colorIsDark, threadHasPermission } from 'lib/shared/thread-utils.js';
import type { Shape } from 'lib/types/core.js';
import type {
  CreateEntryInfo,
  SaveEntryInfo,
  SaveEntryResult,
  SaveEntryPayload,
  CreateEntryPayload,
  DeleteEntryInfo,
  DeleteEntryResult,
  CalendarQuery,
} from 'lib/types/entry-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import {
  type ThreadInfo,
  type ResolvedThreadInfo,
  threadPermissions,
} from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { dateString } from 'lib/utils/date-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { ServerError } from 'lib/utils/errors.js';
import sleep from 'lib/utils/sleep.js';

import type { EntryInfoWithHeight } from './calendar.react.js';
import LoadingIndicator from './loading-indicator.react.js';
import {
  type MessageListParams,
  useNavigateToThread,
} from '../chat/message-list-types.js';
import Button from '../components/button.react.js';
import { SingleLine } from '../components/single-line.react.js';
import TextInput from '../components/text-input.react.js';
import Markdown from '../markdown/markdown.react.js';
import { inlineMarkdownRules } from '../markdown/rules.react.js';
import {
  createIsForegroundSelector,
  nonThreadCalendarQuery,
} from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { ThreadPickerModalRouteName } from '../navigation/route-names.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { colors, useStyles } from '../themes/colors.js';
import type { LayoutEvent } from '../types/react-native.js';
import { waitForInteractions } from '../utils/timers.js';

function hueDistance(firstColor: string, secondColor: string): number {
  const firstHue = tinycolor(firstColor).toHsv().h;
  const secondHue = tinycolor(secondColor).toHsv().h;
  const distance = Math.abs(firstHue - secondHue);
  return distance > 180 ? 360 - distance : distance;
}
const omitEntryInfo = _omit(['entryInfo']);

function dummyNodeForEntryHeightMeasurement(
  entryText: string,
): React.Element<typeof View> {
  const text = entryText === '' ? ' ' : entryText;
  return (
    <View style={[unboundStyles.entry, unboundStyles.textContainer]}>
      <Text style={unboundStyles.text}>{text}</Text>
    </View>
  );
}

type SharedProps = {
  +navigation: TabNavigationProp<'Calendar'>,
  +entryInfo: EntryInfoWithHeight,
  +visible: boolean,
  +active: boolean,
  +makeActive: (entryKey: string, active: boolean) => void,
  +onEnterEditMode: (entryInfo: EntryInfoWithHeight) => void,
  +onConcludeEditMode: (entryInfo: EntryInfoWithHeight) => void,
  +onPressWhitespace: () => void,
  +entryRef: (entryKey: string, entry: ?InternalEntry) => void,
};
type BaseProps = {
  ...SharedProps,
  +threadInfo: ThreadInfo,
};
type Props = {
  ...SharedProps,
  +threadInfo: ResolvedThreadInfo,
  // Redux state
  +calendarQuery: () => CalendarQuery,
  +online: boolean,
  +styles: typeof unboundStyles,
  // Nav state
  +threadPickerActive: boolean,
  +navigateToThread: (params: MessageListParams) => void,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +createEntry: (info: CreateEntryInfo) => Promise<CreateEntryPayload>,
  +saveEntry: (info: SaveEntryInfo) => Promise<SaveEntryResult>,
  +deleteEntry: (info: DeleteEntryInfo) => Promise<DeleteEntryResult>,
};
type State = {
  +editing: boolean,
  +text: string,
  +loadingStatus: LoadingStatus,
  +height: number,
};
class InternalEntry extends React.Component<Props, State> {
  textInput: ?React.ElementRef<typeof BaseTextInput>;
  creating: boolean = false;
  needsUpdateAfterCreation: boolean = false;
  needsDeleteAfterCreation: boolean = false;
  nextSaveAttemptIndex: number = 0;
  mounted: boolean = false;
  deleted: boolean = false;
  currentlySaving: ?string;

  constructor(props: Props) {
    super(props);
    this.state = {
      editing: false,
      text: props.entryInfo.text,
      loadingStatus: 'inactive',
      height: props.entryInfo.textHeight,
    };
    this.state = {
      ...this.state,
      editing: InternalEntry.isActive(props, this.state),
    };
  }

  guardedSetState(input: Shape<State>) {
    if (this.mounted) {
      this.setState(input);
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      !shallowequal(nextState, this.state) ||
      !shallowequal(omitEntryInfo(nextProps), omitEntryInfo(this.props)) ||
      !_isEqual(nextProps.entryInfo)(this.props.entryInfo)
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const wasActive = InternalEntry.isActive(prevProps, prevState);
    const isActive = InternalEntry.isActive(this.props, this.state);

    if (
      !isActive &&
      (this.props.entryInfo.text !== prevProps.entryInfo.text ||
        this.props.entryInfo.textHeight !== prevProps.entryInfo.textHeight) &&
      (this.props.entryInfo.text !== this.state.text ||
        this.props.entryInfo.textHeight !== this.state.height)
    ) {
      this.guardedSetState({
        text: this.props.entryInfo.text,
        height: this.props.entryInfo.textHeight,
      });
      this.currentlySaving = null;
    }

    if (
      !this.props.active &&
      this.state.text === prevState.text &&
      this.state.height !== prevState.height &&
      this.state.height !== this.props.entryInfo.textHeight
    ) {
      const approxMeasuredHeight = Math.round(this.state.height * 1000) / 1000;
      const approxExpectedHeight =
        Math.round(this.props.entryInfo.textHeight * 1000) / 1000;
      console.log(
        `Entry height for ${entryKey(this.props.entryInfo)} was expected to ` +
          `be ${approxExpectedHeight} but is actually ` +
          `${approxMeasuredHeight}. This means Calendar's FlatList isn't ` +
          'getting the right item height for some of its nodes, which is ' +
          'guaranteed to cause glitchy behavior. Please investigate!!',
      );
    }

    // Our parent will set the active prop to false if something else gets
    // pressed or if the Entry is scrolled out of view. In either of those cases
    // we should complete the edit process.
    if (!this.props.active && prevProps.active) {
      this.completeEdit();
    }

    if (this.state.height !== prevState.height || isActive !== wasActive) {
      LayoutAnimation.easeInEaseOut();
    }

    if (
      this.props.online &&
      !prevProps.online &&
      this.state.loadingStatus === 'error'
    ) {
      this.save();
    }

    if (
      this.state.editing &&
      prevState.editing &&
      (this.state.text.trim() === '') !== (prevState.text.trim() === '')
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
    this.props.onConcludeEditMode(this.props.entryInfo);
  }

  static isActive(props: Props, state: State): boolean {
    return (
      props.active ||
      state.editing ||
      !props.entryInfo.id ||
      state.loadingStatus !== 'inactive'
    );
  }

  render(): React.Node {
    const active = InternalEntry.isActive(this.props, this.state);
    const { editing } = this.state;
    const threadColor = `#${this.props.threadInfo.color}`;

    const darkColor = colorIsDark(this.props.threadInfo.color);
    let actionLinks = null;
    if (active) {
      const actionLinksColor = darkColor ? '#D3D3D3' : '#404040';
      const actionLinksTextStyle = { color: actionLinksColor };
      const { modalIosHighlightUnderlay: actionLinksUnderlayColor } = darkColor
        ? colors.dark
        : colors.light;
      const loadingIndicatorCanUseRed = hueDistance('red', threadColor) > 50;
      let editButtonContent = null;
      if (editing && this.state.text.trim() === '') {
        // nothing
      } else if (editing) {
        editButtonContent = (
          <React.Fragment>
            <Icon name="check" size={14} color={actionLinksColor} />
            <Text
              style={[this.props.styles.leftLinksText, actionLinksTextStyle]}
            >
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
              style={this.props.styles.pencilIcon}
            />
            <Text
              style={[this.props.styles.leftLinksText, actionLinksTextStyle]}
            >
              EDIT
            </Text>
          </React.Fragment>
        );
      }
      actionLinks = (
        <View style={this.props.styles.actionLinks}>
          <View style={this.props.styles.leftLinks}>
            <Button
              onPress={this.delete}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={this.props.styles.button}
            >
              <View style={this.props.styles.buttonContents}>
                <Icon name="close" size={14} color={actionLinksColor} />
                <Text
                  style={[
                    this.props.styles.leftLinksText,
                    actionLinksTextStyle,
                  ]}
                >
                  DELETE
                </Text>
              </View>
            </Button>
            <Button
              onPress={this.onPressEdit}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={this.props.styles.button}
            >
              <View style={this.props.styles.buttonContents}>
                {editButtonContent}
              </View>
            </Button>
          </View>
          <View style={this.props.styles.rightLinks}>
            <LoadingIndicator
              loadingStatus={this.state.loadingStatus}
              color={actionLinksColor}
              canUseRed={loadingIndicatorCanUseRed}
            />
            <Button
              onPress={this.onPressThreadName}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={this.props.styles.button}
            >
              <SingleLine
                style={[this.props.styles.rightLinksText, actionLinksTextStyle]}
              >
                {this.props.threadInfo.uiName}
              </SingleLine>
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
        backgroundColor: threadColor,
      };
      const selectionColor = darkColor ? '#129AFF' : '#036AFF';
      textInput = (
        <TextInput
          style={[this.props.styles.textInput, textInputStyle]}
          value={this.state.text}
          onChangeText={this.onChangeText}
          multiline={true}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          selectionColor={selectionColor}
          ref={this.textInputRef}
        />
      );
    }

    let rawText = this.state.text;
    if (rawText === '' || rawText.slice(-1) === '\n') {
      rawText += ' ';
    }
    const textStyle = {
      ...this.props.styles.text,
      color: textColor,
      opacity: textInput ? 0 : 1,
    };
    // We use an empty View to set the height of the entry, and then position
    // the Text and TextInput absolutely. This allows to measure height changes
    // to the Text while controlling the actual height of the entry.
    const heightStyle = { height: this.state.height };
    const entryStyle = { backgroundColor: threadColor };
    const opacity = editing ? 1.0 : 0.6;
    const canEditEntry = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.EDIT_ENTRIES,
    );
    return (
      <TouchableWithoutFeedback onPress={this.props.onPressWhitespace}>
        <View style={this.props.styles.container}>
          <Button
            disabled={!canEditEntry}
            onPress={this.setActive}
            style={[this.props.styles.entry, entryStyle]}
            androidFormat="opacity"
            iosActiveOpacity={opacity}
          >
            <View>
              <View style={heightStyle} />
              <View
                style={this.props.styles.textContainer}
                onLayout={this.onTextContainerLayout}
              >
                <Markdown
                  style={textStyle}
                  rules={inlineMarkdownRules(darkColor)}
                >
                  {rawText}
                </Markdown>
              </View>
              {textInput}
            </View>
            {actionLinks}
          </Button>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  textInputRef: (textInput: ?React.ElementRef<typeof BaseTextInput>) => void =
    textInput => {
      this.textInput = textInput;
      if (textInput && this.state.editing) {
        this.enterEditMode();
      }
    };

  enterEditMode: () => Promise<void> = async () => {
    this.setActive();
    this.props.onEnterEditMode(this.props.entryInfo);
    if (Platform.OS === 'android') {
      // If we don't do this, the TextInput focuses
      // but the soft keyboard doesn't come up
      await waitForInteractions();
      await sleep(15);
    }
    this.focus();
  };

  focus: () => void = () => {
    const { textInput } = this;
    if (!textInput) {
      return;
    }
    textInput.focus();
  };

  onFocus: () => void = () => {
    if (this.props.threadPickerActive) {
      this.props.navigation.goBack();
    }
  };

  setActive: () => void = () => this.makeActive(true);

  completeEdit: () => void = () => {
    // This gets called from CalendarInputBar (save button above keyboard),
    // onPressEdit (save button in Entry action links), and in
    // componentDidUpdate above when Calendar sets this Entry to inactive.
    // Calendar does this if something else gets pressed or the Entry is
    // scrolled out of view. Note that an Entry won't consider itself inactive
    // until it's done updating the server with its state, and if the network
    // requests fail it may stay "active".
    if (this.textInput) {
      this.textInput.blur();
    }
    this.onBlur();
  };

  onBlur: () => void = () => {
    if (this.state.text.trim() === '') {
      this.delete();
    } else if (this.props.entryInfo.text !== this.state.text) {
      this.save();
    }
    this.guardedSetState({ editing: false });
    this.makeActive(false);
    this.props.onConcludeEditMode(this.props.entryInfo);
  };

  save: () => void = () => {
    this.dispatchSave(this.props.entryInfo.id, this.state.text);
  };

  onTextContainerLayout: (event: LayoutEvent) => void = event => {
    this.guardedSetState({
      height: Math.ceil(event.nativeEvent.layout.height),
    });
  };

  onChangeText: (newText: string) => void = newText => {
    this.guardedSetState({ text: newText });
  };

  makeActive(active: boolean) {
    const { threadInfo } = this.props;
    if (!threadHasPermission(threadInfo, threadPermissions.EDIT_ENTRIES)) {
      return;
    }
    this.props.makeActive(entryKey(this.props.entryInfo), active);
  }

  dispatchSave(serverID: ?string, newText: string) {
    if (this.currentlySaving === newText) {
      return;
    }
    this.currentlySaving = newText;

    if (newText.trim() === '') {
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

    this.guardedSetState({ loadingStatus: 'loading' });
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

  async createAction(text: string): Promise<CreateEntryPayload> {
    const localID = this.props.entryInfo.localID;
    invariant(localID, "if there's no serverID, there should be a localID");
    const curSaveAttempt = this.nextSaveAttemptIndex++;
    try {
      const response = await this.props.createEntry({
        text,
        timestamp: this.props.entryInfo.creationTime,
        date: dateString(
          this.props.entryInfo.year,
          this.props.entryInfo.month,
          this.props.entryInfo.day,
        ),
        threadID: this.props.entryInfo.threadID,
        localID,
        calendarQuery: this.props.calendarQuery(),
      });
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: 'inactive' });
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
      return response;
    } catch (e) {
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: 'error' });
      }
      this.currentlySaving = null;
      this.creating = false;
      throw e;
    }
  }

  async saveAction(
    entryID: string,
    newText: string,
  ): Promise<SaveEntryPayload> {
    const curSaveAttempt = this.nextSaveAttemptIndex++;
    try {
      const response = await this.props.saveEntry({
        entryID,
        text: newText,
        prevText: this.props.entryInfo.text,
        timestamp: Date.now(),
        calendarQuery: this.props.calendarQuery(),
      });
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: 'inactive' });
      }
      return { ...response, threadID: this.props.entryInfo.threadID };
    } catch (e) {
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: 'error' });
      }
      this.currentlySaving = null;
      if (e instanceof ServerError && e.message === 'concurrent_modification') {
        const revertedText = e.payload?.db;
        const onRefresh = () => {
          this.guardedSetState({
            loadingStatus: 'inactive',
            text: revertedText,
          });
          this.props.dispatch({
            type: concurrentModificationResetActionType,
            payload: { id: entryID, dbText: revertedText },
          });
        };
        Alert.alert(
          'Concurrent modification',
          'It looks like somebody is attempting to modify that field at the ' +
            'same time as you! Please try again.',
          [{ text: 'OK', onPress: onRefresh }],
          { cancelable: false },
        );
      }
      throw e;
    }
  }

  delete: () => void = () => {
    this.dispatchDelete(this.props.entryInfo.id);
  };

  onPressEdit: () => void = () => {
    if (this.state.editing) {
      this.completeEdit();
    } else {
      this.guardedSetState({ editing: true });
    }
  };

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

  async deleteAction(serverID: ?string): Promise<?DeleteEntryResult> {
    if (serverID) {
      return await this.props.deleteEntry({
        entryID: serverID,
        prevText: this.props.entryInfo.text,
        calendarQuery: this.props.calendarQuery(),
      });
    } else if (this.creating) {
      this.needsDeleteAfterCreation = true;
    }
    return null;
  }

  onPressThreadName: () => void = () => {
    Keyboard.dismiss();
    this.props.navigateToThread({ threadInfo: this.props.threadInfo });
  };
}

const unboundStyles = {
  actionLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },
  button: {
    padding: 5,
  },
  buttonContents: {
    flex: 1,
    flexDirection: 'row',
  },
  container: {
    backgroundColor: 'listBackground',
  },
  entry: {
    borderRadius: 8,
    margin: 5,
    overflow: 'hidden',
  },
  leftLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 5,
  },
  leftLinksText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingLeft: 5,
  },
  pencilIcon: {
    lineHeight: 13,
    paddingTop: 1,
  },
  rightLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 5,
  },
  rightLinksText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  text: {
    fontFamily: 'System',
    fontSize: 16,
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    transform: (Platform.select({
      ios: [{ translateY: -1 / 3 }],
      default: [],
    }): $ReadOnlyArray<{ +translateY: number }>),
  },
  textInput: {
    fontFamily: 'System',
    fontSize: 16,
    left: ((Platform.OS === 'android' ? 9.8 : 10): number),
    margin: 0,
    padding: 0,
    position: 'absolute',
    right: 10,
    top: ((Platform.OS === 'android' ? 4.8 : 0.5): number),
  },
};

registerFetchKey(saveEntryActionTypes);
registerFetchKey(deleteEntryActionTypes);
const activeThreadPickerSelector = createIsForegroundSelector(
  ThreadPickerModalRouteName,
);

const Entry: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedEntry(props: BaseProps) {
    const navContext = React.useContext(NavContext);
    const threadPickerActive = activeThreadPickerSelector(navContext);

    const calendarQuery = useSelector(state =>
      nonThreadCalendarQuery({
        redux: state,
        navContext,
      }),
    );
    const online = useSelector(
      state => state.connection.status === 'connected',
    );
    const styles = useStyles(unboundStyles);

    const navigateToThread = useNavigateToThread();

    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const callCreateEntry = useServerCall(createEntry);
    const callSaveEntry = useServerCall(saveEntry);
    const callDeleteEntry = useServerCall(deleteEntry);

    const { threadInfo: unresolvedThreadInfo, ...restProps } = props;
    const threadInfo = useResolvedThreadInfo(unresolvedThreadInfo);

    return (
      <InternalEntry
        {...restProps}
        threadPickerActive={threadPickerActive}
        calendarQuery={calendarQuery}
        online={online}
        styles={styles}
        navigateToThread={navigateToThread}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        createEntry={callCreateEntry}
        saveEntry={callSaveEntry}
        deleteEntry={callDeleteEntry}
        threadInfo={threadInfo}
      />
    );
  },
);

export { InternalEntry, Entry, dummyNodeForEntryHeightMeasurement };
