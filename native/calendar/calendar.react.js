// @flow

import {
  type EntryInfo,
  entryInfoPropType,
  type CalendarQuery,
  type CalendarResult,
} from 'lib/types/entry-types';
import type { AppState } from '../redux-setup';
import type { CalendarItem } from '../selectors/calendar-selectors';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { KeyboardEvent } from '../keyboard';
import type { TextToMeasure } from '../text-height-measurer.react';
import type { NavigationScreenProp, NavigationRoute } from 'react-navigation';

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  AppState as NativeAppState,
  Platform,
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import _isEqual from 'lodash/fp/isEqual';
import _map from 'lodash/fp/map';
import _find from 'lodash/fp/find';
import _differenceWith from 'lodash/fp/differenceWith';
import _filter from 'lodash/fp/filter';
import _sum from 'lodash/fp/sum';
import _pickBy from 'lodash/fp/pickBy';
import _size from 'lodash/fp/size';

import { entryKey } from 'lib/shared/entry-utils';
import { dateString, prettyDate, dateFromString } from 'lib/utils/date-utils';
import { sessionExpired } from 'lib/selectors/session-selectors';
import {
  fetchEntriesAndAppendRangeActionTypes,
  fetchEntriesWithRange,
} from 'lib/actions/entry-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { simpleNavID } from 'lib/selectors/nav-selectors';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import Modal from 'react-native-modal';

import { Entry, InternalEntry, entryStyles } from './entry.react';
import { contentVerticalOffset, windowHeight, tabBarSize } from '../dimensions';
import { calendarListData } from '../selectors/calendar-selectors';
import { createActiveTabSelector } from '../selectors/nav-selectors';
import TextHeightMeasurer from '../text-height-measurer.react';
import ListLoadingIndicator from '../list-loading-indicator.react';
import SectionFooter from './section-footer.react';
import ThreadPicker from './thread-picker.react';
import CalendarInputBar from './calendar-input-bar.react';
import { iosKeyboardOffset } from '../dimensions';

export type EntryInfoWithHeight = EntryInfo & { textHeight: number };
type CalendarItemWithHeight =
  {
    itemType: "loader",
    key: string,
  } | {
    itemType: "header",
    dateString: string,
  } | {
    itemType: "entryInfo",
    entryInfo: EntryInfoWithHeight,
  } | {
    itemType: "footer",
    dateString: string,
  };
type ExtraData = {
  activeEntries: {[key: string]: bool},
  visibleEntries: {[key: string]: bool},
};

// This is v sad :(
// Overall, I have to say, this component is probably filled with more sadness
// than any other component in this project. This owes mostly to its complex
// infinite-scrolling behavior.
// But not this particular piece of sadness, actually. We have to cache the
// current InnerCalendar ref here so we can access it from the statically
// defined navigationOptions.tabBarOnPress below.
let currentCalendarRef: ?InnerCalendar = null;

const forceInset = { top: 'always', bottom: 'never' };

type Props = {
  navigation: NavigationScreenProp<NavigationRoute>,
  // Redux state
  listData: ?$ReadOnlyArray<CalendarItem>,
  tabActive: bool,
  sessionID: string,
  sessionExpired: () => bool,
  startDate: string,
  endDate: string,
  simpleNavID: string,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  fetchEntriesWithRange: (
    calendarQuery: CalendarQuery,
  ) => Promise<CalendarResult>,
};
type State = {
  textToMeasure: TextToMeasure[],
  listDataWithHeights: ?$ReadOnlyArray<CalendarItemWithHeight>,
  readyToShowList: bool,
  threadPickerOpen: bool,
  pendingNewEntryDateString: ?string,
  extraData: ExtraData,
  scrollToOffsetAfterSuppressingKeyboardDismissal: ?number,
};
class InnerCalendar extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    listData: PropTypes.arrayOf(PropTypes.oneOfType([
      PropTypes.shape({
        itemType: PropTypes.oneOf(["loader"]),
        key: PropTypes.string.isRequired,
      }),
      PropTypes.shape({
        itemType: PropTypes.oneOf(["header"]),
        dateString: PropTypes.string.isRequired,
      }),
      PropTypes.shape({
        itemType: PropTypes.oneOf(["entryInfo"]),
        entryInfo: entryInfoPropType.isRequired,
      }),
      PropTypes.shape({
        itemType: PropTypes.oneOf(["footer"]),
        dateString: PropTypes.string.isRequired,
      }),
    ])),
    tabActive: PropTypes.bool.isRequired,
    sessionID: PropTypes.string.isRequired,
    sessionExpired: PropTypes.func.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    simpleNavID: PropTypes.string.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    fetchEntriesWithRange: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    tabBarLabel: 'Calendar',
    tabBarIcon: ({ tintColor }) => (
      <Icon
        name="calendar"
        style={[styles.icon, { color: tintColor }]}
      />
    ),
    tabBarOnPress: ({ scene, jumpToIndex}: {
      scene: { index: number, focused: bool },
      jumpToIndex: (index: number) => void,
    }) => {
      if (scene.focused && currentCalendarRef) {
        currentCalendarRef.scrollToToday();
      } else {
        jumpToIndex(scene.index);
      }
    },
  };
  flatList: ?FlatList<CalendarItemWithHeight> = null;
  textHeights: ?Map<string, number> = null;
  currentState: ?string = NativeAppState.currentState;
  loadingFromScroll = false;
  currentScrollPosition: ?number = null;
  // We don't always want an extraData update to trigger a state update, so we
  // cache the most recent value as a member here
  latestExtraData: ExtraData;
  // For some reason, we have to delay the scrollToToday call after the first
  // scroll upwards on Android. I don't know why. Might only be on the emulator.
  firstScrollUpOnAndroidComplete = false;
  // When an entry becomes active, we make a note of its key so that once the
  // keyboard event happens, we know where to move the scrollPos to
  lastEntryKeyActive: ?string = null;
  keyboardShowListener: ?Object;
  keyboardDismissListener: ?Object;
  keyboardShownHeight: ?number = null;
  // We wait until the loaders leave view before letting them be triggered again
  topLoaderWaitingToLeaveView = true;
  bottomLoaderWaitingToLeaveView = true;
  // We keep refs to the entries so CalendarInputBar can save them
  entryRefs = new Map();

  constructor(props: Props) {
    super(props);
    const textToMeasure = props.listData
      ? InnerCalendar.textToMeasureFromListData(props.listData)
      : [];
    this.latestExtraData = {
      activeEntries: {},
      visibleEntries: {},
    };
    this.state = {
      textToMeasure,
      listDataWithHeights: null,
      readyToShowList: false,
      threadPickerOpen: false,
      pendingNewEntryDateString: null,
      extraData: this.latestExtraData,
      scrollToOffsetAfterSuppressingKeyboardDismissal: null,
    };
    currentCalendarRef = this;
  }

  static textToMeasureFromListData(listData: $ReadOnlyArray<CalendarItem>) {
    const textToMeasure = [];
    for (let item of listData) {
      if (item.itemType !== "entryInfo") {
        continue;
      }
      textToMeasure.push({
        id: entryKey(item.entryInfo),
        text: item.entryInfo.text,
      });
    }
    return textToMeasure;
  }

  componentDidMount() {
    NativeAppState.addEventListener('change', this.handleAppStateChange);
    if (this.props.tabActive) {
      this.keyboardShowListener = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
        this.keyboardShow,
      );
      this.keyboardDismissListener = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
        this.keyboardDismiss,
      );
    }
  }

  componentWillUnmount() {
    NativeAppState.removeEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextAppState: ?string) => {
    // If upon foregrounding we find the session expired we scroll to today
    const lastState = this.currentState;
    this.currentState = nextAppState;
    if (
      lastState &&
      lastState.match(/inactive|background/) &&
      this.currentState === "active" &&
      this.props.sessionExpired() &&
      !this.props.tabActive &&
      this.flatList
    ) {
      this.scrollToToday();
    }
  }

  componentWillReceiveProps(newProps: Props) {
    // When the listData changes we may need to recalculate some heights
    if (newProps.listData === this.props.listData) {
      return;
    }
    const newListData = newProps.listData;

    if (!newListData) {
      this.latestExtraData = {
        activeEntries: {},
        visibleEntries: {},
      };
      this.setState({
        textToMeasure: [],
        listDataWithHeights: null,
        readyToShowList: false,
        extraData: this.latestExtraData,
      });
      this.topLoaderWaitingToLeaveView = true;
      this.bottomLoaderWaitingToLeaveView = true;
      return;
    }

    const newTextToMeasure = InnerCalendar.textToMeasureFromListData(
      newListData,
    );
    const newText =
      _differenceWith(_isEqual)(newTextToMeasure)(this.state.textToMeasure);
    if (newText.length !== 0) {
      // We set textHeights to null here since if a future set of text
      // came in before we completed text measurement that was a subset
      // of the earlier text, we would end up merging directly there, but
      // then when the measurement for the middle text came in it would
      // override the newer text heights.
      this.textHeights = null;
      this.setState({ textToMeasure: newTextToMeasure });
      return;
    }

    let allTextAlreadyMeasured = false;
    if (this.textHeights) {
      allTextAlreadyMeasured = true;
      for (let textToMeasure of newTextToMeasure) {
        if (!this.textHeights.has(textToMeasure.id)) {
          allTextAlreadyMeasured = false;
          break;
        }
      }
    }
    if (allTextAlreadyMeasured) {
      this.mergeHeightsIntoListData(newListData);
    }

    // If we don't have everything in textHeights, but we do have everything in
    // textToMeasure, we can conclude that we're just waiting for the
    // measurement to complete and then we'll be good.
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (nextProps.tabActive && !this.props.tabActive) {
      if (!this.keyboardShowListener) {
        this.keyboardShowListener = Keyboard.addListener(
          Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
          this.keyboardShow,
        );
      }
      if (!this.keyboardDismissListener) {
        this.keyboardDismissListener = Keyboard.addListener(
          Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
          this.keyboardDismiss,
        );
      }
    } else if (!nextProps.tabActive && this.props.tabActive) {
      if (this.keyboardShowListener) {
        this.keyboardShowListener.remove();
        this.keyboardShowListener = null;
      }
      if (this.keyboardDismissListener) {
        this.keyboardDismissListener.remove();
        this.keyboardDismissListener = null;
      }
    }

    // If the sessionID gets reset and the user isn't looking we scroll to today
    if (
      nextProps.sessionID !== this.props.sessionID &&
      !nextProps.tabActive &&
      this.flatList
    ) {
      this.scrollToToday();
    }

    const lastLDWH = this.state.listDataWithHeights;
    const newLDWH = nextState.listDataWithHeights;
    if (!lastLDWH || !newLDWH) {
      return;
    }
    const { lastStartDate, newStartDate, lastEndDate, newEndDate }
      = InnerCalendar.datesFromListData(lastLDWH, newLDWH);

    if (newStartDate > lastStartDate || newEndDate < lastEndDate) {
      // If there are fewer items in our new data, which happens when the
      // current calendar query gets reset due to inactivity, let's reset the
      // scroll position to the center (today)
      setTimeout(() => this.scrollToToday(), 50);
      this.firstScrollUpOnAndroidComplete = false;
    } else if (newStartDate < lastStartDate) {
      this.updateScrollPositionAfterPrepend(lastLDWH, newLDWH);
    } else if (newEndDate > lastEndDate) {
      this.firstScrollUpOnAndroidComplete = true;
    } else if (newLDWH.length > lastLDWH.length) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // On Android, if the keyboardDismissMode is set to "on-drag", our attempt
    // to scroll the FlatList to avoid the keyboard when the keyboard is being
    // shown can cause the keyboard to immediately get dismissed. To avoid this,
    // we make sure to temporarily set the keyboardDismissMode to "none" when
    // doing this scroll. Only after that do we execute the scroll, and we make
    // sure to reset keyboardDismissMode 0.5s after the scroll starts.
    const newOffset =
      this.state.scrollToOffsetAfterSuppressingKeyboardDismissal;
    const oldOffset = prevState.scrollToOffsetAfterSuppressingKeyboardDismissal;
    if (
      (newOffset !== undefined && newOffset !== null) &&
      (oldOffset === undefined || oldOffset === null)
    ) {
      invariant(this.flatList, "flatList should be set");
      this.flatList.scrollToOffset({ offset: newOffset, animated: true });
      setTimeout(
        () => this.setState({
          scrollToOffsetAfterSuppressingKeyboardDismissal: null,
        }),
        500,
      );
    }

    const lastLDWH = prevState.listDataWithHeights;
    const newLDWH = this.state.listDataWithHeights;
    if (!lastLDWH || !newLDWH) {
      return;
    }
    const { lastStartDate, newStartDate, lastEndDate, newEndDate }
      = InnerCalendar.datesFromListData(lastLDWH, newLDWH);
    if (newStartDate < lastStartDate || newEndDate > lastEndDate) {
      this.loadingFromScroll = false;
    }
  }

  static datesFromListData(
    lastLDWH: $ReadOnlyArray<CalendarItemWithHeight>,
    newLDWH: $ReadOnlyArray<CalendarItemWithHeight>,
  ) {
    const lastSecondItem = lastLDWH[1];
    const newSecondItem = newLDWH[1];
    invariant(
      newSecondItem.itemType === "header" &&
        lastSecondItem.itemType === "header",
      "second item in listData should be a header",
    );
    const lastStartDate = dateFromString(lastSecondItem.dateString);
    const newStartDate = dateFromString(newSecondItem.dateString);

    const lastPenultimateItem = lastLDWH[lastLDWH.length - 2];
    const newPenultimateItem = newLDWH[newLDWH.length - 2];
    invariant(
      newPenultimateItem.itemType === "footer" &&
        lastPenultimateItem.itemType === "footer",
      "penultimate item in listData should be a footer",
    );
    const lastEndDate = dateFromString(lastPenultimateItem.dateString);
    const newEndDate = dateFromString(newPenultimateItem.dateString);

    return { lastStartDate, newStartDate, lastEndDate, newEndDate };
  }

  /**
   * When prepending list items, FlatList isn't smart about preserving scroll
   * position. If we're at the start of the list before prepending, FlatList
   * will just keep us at the front after prepending. But we want to preserve
   * the previous on-screen items, so we have to do a calculation to get the new
   * scroll position. (And deal with the inherent glitchiness of trying to time
   * that change with the items getting prepended... *sigh*.)
   */
  updateScrollPositionAfterPrepend(
    lastLDWH: $ReadOnlyArray<CalendarItemWithHeight>,
    newLDWH: $ReadOnlyArray<CalendarItemWithHeight>,
  ) {
    const existingKeys = new Set(_map(InnerCalendar.keyExtractor)(lastLDWH));
    const newItems = _filter(
      (item: CalendarItemWithHeight) =>
        !existingKeys.has(InnerCalendar.keyExtractor(item)),
    )(newLDWH);
    const heightOfNewItems = InnerCalendar.heightOfItems(newItems);
    const flatList = this.flatList;
    invariant(flatList, "flatList should be set");
    const scrollAction = () => {
      invariant(
        this.currentScrollPosition !== undefined &&
          this.currentScrollPosition !== null,
        "currentScrollPosition should be set",
      );
      const currentScrollPosition =
        Math.max(this.currentScrollPosition, 0);
      let offset = currentScrollPosition + heightOfNewItems;
      flatList.scrollToOffset({
        offset,
        animated: false,
      });
    };
    if (Platform.OS === "android" && !this.firstScrollUpOnAndroidComplete) {
      setTimeout(scrollAction, 0);
      this.firstScrollUpOnAndroidComplete = true;
    } else {
      scrollAction();
    }
  }

  mergeHeightsIntoListData(listData: $ReadOnlyArray<CalendarItem>) {
    const textHeights = this.textHeights;
    invariant(textHeights, "textHeights should be set");
    const listDataWithHeights = _map((item: CalendarItem) => {
      if (item.itemType !== "entryInfo") {
        return item;
      }
      const entryInfo = item.entryInfo;
      const textHeight = textHeights.get(entryKey(entryInfo));
      invariant(
        textHeight,
        `height for ${entryKey(entryInfo)} should be set`,
      );
      return {
        ...item,
        entryInfo: {
          ...item.entryInfo,
          textHeight: Math.ceil(textHeight),
        },
      };
    })(listData);
    if (
      // At the start, we need to set LoaderWaitingToLeaveView since we don't
      // want the loaders to trigger when nothing is there
      !this.state.listDataWithHeights ||
      // We know that this is going to shrink our FlatList. When our FlatList
      // shrinks, componentWillUpdate will trigger scrollToToday
      listDataWithHeights.length < this.state.listDataWithHeights.length
    ) {
      this.topLoaderWaitingToLeaveView = true;
      this.bottomLoaderWaitingToLeaveView = true;
    }
    this.setState({ listDataWithHeights });
  }

  scrollToToday = (animated: ?bool = undefined) => {
    if (animated === undefined) {
      animated = this.props.tabActive;
    }
    invariant(this.state.listDataWithHeights, "should be set");
    const todayIndex = _findIndex(['dateString', dateString(new Date())])
      (this.state.listDataWithHeights);
    invariant(this.flatList, "flatList should be set");
    this.flatList.scrollToIndex({
      index: todayIndex,
      animated,
      viewPosition: 0.5,
    });
  }

  renderItem = (row: { item: CalendarItemWithHeight }) => {
    const item = row.item;
    if (item.itemType === "loader") {
      return <ListLoadingIndicator />;
    } else if (item.itemType === "header") {
      return InnerCalendar.renderSectionHeader(row);
    } else if (item.itemType === "entryInfo") {
      const key = entryKey(item.entryInfo);
      return (
        <Entry
          entryInfo={item.entryInfo}
          active={!!this.state.extraData.activeEntries[key]}
          visible={!!this.state.extraData.visibleEntries[key]}
          makeActive={this.makeActive}
          onEnterEditMode={this.onEnterEntryEditMode}
          navigate={this.props.navigation.navigate}
          entryRef={this.entryRef}
        />
      );
    } else if (item.itemType === "footer") {
      return this.renderSectionFooter(row);
    }
    invariant(false, "renderItem conditions should be exhaustive");
  }

  static renderSectionHeader = (row: { item: CalendarItemWithHeight }) => {
    invariant(row.item.itemType === "header", "itemType should be header");
    let date = prettyDate(row.item.dateString);
    if (dateString(new Date()) === row.item.dateString) {
      date += " (today)";
    }
    return (
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionHeaderText}>
            {date}
          </Text>
        </View>
      </View>
    );
  }

  renderSectionFooter = (row: { item: CalendarItemWithHeight }) => {
    invariant(row.item.itemType === "footer", "itemType should be footer");
    return (
      <SectionFooter dateString={row.item.dateString} onAdd={this.onAdd} />
    );
  }

  onAdd = (dayString: string) => {
    Keyboard.dismiss();
    this.setState({
      threadPickerOpen: true,
      pendingNewEntryDateString: dayString,
    });
  }

  static keyExtractor = (item: CalendarItemWithHeight) => {
    if (item.itemType === "loader") {
      return item.key;
    } else if (item.itemType === "header") {
      return item.dateString + "/header";
    } else if (item.itemType === "entryInfo") {
      return entryKey(item.entryInfo);
    } else if (item.itemType === "footer") {
      return item.dateString + "/footer";
    }
    invariant(false, "keyExtractor conditions should be exhaustive");
  }

  static getItemLayout(
    data: ?$ReadOnlyArray<CalendarItemWithHeight>,
    index: number,
  ) {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset =
      InnerCalendar.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? InnerCalendar.itemHeight(item) : 0;
    return { length, offset, index };
  }

  static itemHeight(item: CalendarItemWithHeight): number {
    if (item.itemType === "loader") {
      return 56;
    } else if (item.itemType === "header") {
      return 31;
    } else if (item.itemType === "entryInfo") {
      const verticalPadding = 10;
      return verticalPadding + item.entryInfo.textHeight;
    } else if (item.itemType === "footer") {
      return 40;
    }
    invariant(false, "itemHeight conditions should be exhaustive");
  }

  static heightOfItems(data: $ReadOnlyArray<CalendarItemWithHeight>): number {
    return _sum(data.map(InnerCalendar.itemHeight));
  }

  render() {
    const listDataWithHeights = this.state.listDataWithHeights;
    let flatList = null;
    if (listDataWithHeights) {
      const flatListStyle = { opacity: this.state.readyToShowList ? 1 : 0 };
      const initialScrollIndex =
        InnerCalendar.initialScrollIndex(listDataWithHeights);
      const pendingScrollOffset =
        this.state.scrollToOffsetAfterSuppressingKeyboardDismissal;
      const keyboardDismissMode =
        pendingScrollOffset !== null && pendingScrollOffset !== undefined
          ? "none"
          : "on-drag";
      flatList = (
        <FlatList
          data={listDataWithHeights}
          renderItem={this.renderItem}
          keyExtractor={InnerCalendar.keyExtractor}
          getItemLayout={InnerCalendar.getItemLayout}
          onViewableItemsChanged={this.onViewableItemsChanged}
          onScroll={this.onScroll}
          initialScrollIndex={initialScrollIndex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={keyboardDismissMode}
          onMomentumScrollEnd={this.onMomentumScrollEnd}
          onScrollEndDrag={this.onScrollEndDrag}
          extraData={this.state.extraData}
          style={[styles.flatList, flatListStyle]}
          ref={this.flatListRef}
        />
      );
    }
    let loadingIndicator = null;
    if (!listDataWithHeights || !this.state.readyToShowList) {
      loadingIndicator = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator
            color="black"
            size="large"
            style={styles.loadingIndicator}
          />
        </View>
      );
    }
    const keyboardAvoidingViewBehavior = Platform.OS === "ios"
      ? "padding"
      : undefined;
    const keyboardVerticalOffset = Platform.OS === "ios"
      ? iosKeyboardOffset
      : 0;
    return (
      <SafeAreaView forceInset={forceInset} style={styles.container}>
        <TextHeightMeasurer
          textToMeasure={this.state.textToMeasure}
          allHeightsMeasuredCallback={this.allHeightsMeasured}
          style={entryStyles.text}
        />
        <KeyboardAvoidingView
          behavior={keyboardAvoidingViewBehavior}
          style={styles.keyboardAvoidingView}
        >
          {loadingIndicator}
          {flatList}
          <CalendarInputBar onSave={this.onSaveEntry} />
        </KeyboardAvoidingView>
        <Modal
          isVisible={this.state.threadPickerOpen}
          onBackButtonPress={this.closePicker}
          onBackdropPress={this.closePicker}
        >
          <ThreadPicker
            dateString={this.state.pendingNewEntryDateString}
            close={this.closePicker}
          />
        </Modal>
      </SafeAreaView>
    );
  }

  static flatListHeight() {
    return windowHeight - contentVerticalOffset - tabBarSize;
  }

  static initialScrollIndex(data: $ReadOnlyArray<CalendarItemWithHeight>) {
    const todayIndex = _findIndex(['dateString', dateString(new Date())])(data);
    const heightOfTodayHeader = InnerCalendar.itemHeight(data[todayIndex]);

    let returnIndex = todayIndex;
    let heightLeft = (InnerCalendar.flatListHeight() - heightOfTodayHeader) / 2;
    while (heightLeft > 0) {
      heightLeft -= InnerCalendar.itemHeight(data[--returnIndex]);
    }
    return returnIndex;
  }

  flatListRef = (flatList: ?FlatList<CalendarItemWithHeight>) => {
    this.flatList = flatList;
  }

  entryRef = (entryKey: string, entry: ?InternalEntry) => {
    this.entryRefs.set(entryKey, entry);
  }

  makeActive = (key: string, active: bool) => {
    if (!active) {
      if (_size(this.state.extraData.activeEntries) === 0) {
        if (_size(this.latestExtraData.activeEntries) !== 0) {
          this.latestExtraData = {
            visibleEntries: this.latestExtraData.visibleEntries,
            activeEntries: this.state.extraData.activeEntries,
          };
        }
        return;
      }
      this.latestExtraData = {
        visibleEntries: this.latestExtraData.visibleEntries,
        activeEntries: {},
      };
      this.setState({ extraData: this.latestExtraData });
      return;
    }

    if (
      _size(this.state.extraData.activeEntries) === 1 &&
      this.state.extraData.activeEntries[key]
    ) {
      if (
        _size(this.latestExtraData.activeEntries) !== 1 ||
        !this.latestExtraData.activeEntries[key]
      ) {
        this.latestExtraData = {
          visibleEntries: this.latestExtraData.visibleEntries,
          activeEntries: this.state.extraData.activeEntries,
        };
      }
      return;
    }
    this.latestExtraData = {
      visibleEntries: this.latestExtraData.visibleEntries,
      activeEntries: { [key]: true },
    };
    this.setState({ extraData: this.latestExtraData });
  }

  onEnterEntryEditMode = (entryInfo: EntryInfoWithHeight) => {
    const key = entryKey(entryInfo);
    const keyboardShownHeight = this.keyboardShownHeight;
    if (keyboardShownHeight) {
      this.scrollToKey(key, keyboardShownHeight);
    } else {
      this.lastEntryKeyActive = key;
    }
  }

  keyboardShow = (event: KeyboardEvent) => {
    const inputBarHeight = Platform.OS === "android" ? 37.7 : 35.5;
    const keyboardShownHeight = event.endCoordinates.height + inputBarHeight;
    this.keyboardShownHeight = keyboardShownHeight;
    const lastEntryKeyActive = this.lastEntryKeyActive;
    if (lastEntryKeyActive) {
      this.scrollToKey(lastEntryKeyActive, keyboardShownHeight);
      this.lastEntryKeyActive = null;
    }
  }

  keyboardDismiss = (event: KeyboardEvent) => {
    this.keyboardShownHeight = null;
  }

  scrollToKey(lastEntryKeyActive: string, keyboardHeight: number) {
    const data = this.state.listDataWithHeights;
    invariant(data, "should be set");
    const index = _findIndex(
      (item: CalendarItemWithHeight) =>
        InnerCalendar.keyExtractor(item) === lastEntryKeyActive,
    )(data);
    const itemStart = InnerCalendar.heightOfItems(
      data.filter((_, i) => i < index),
    );
    const itemHeight = InnerCalendar.itemHeight(data[index]);
    const entryAdditionalActiveHeight = Platform.OS === "android" ? 21 : 20;
    const itemEnd = itemStart + itemHeight + entryAdditionalActiveHeight;
    let visibleHeight = InnerCalendar.flatListHeight() - keyboardHeight;
    // flatListHeight() factors in the size of the iOS tab bar, but it is hidden
    // by the keyboard since it is at the bottom
    if (Platform.OS === "ios") {
      visibleHeight += tabBarSize;
    }
    invariant(
      this.currentScrollPosition !== undefined &&
        this.currentScrollPosition !== null,
      "should be set",
    );
    if (
      itemStart > this.currentScrollPosition &&
      itemEnd < this.currentScrollPosition + visibleHeight
    ) {
      return;
    }
    const offset = itemStart - (visibleHeight - itemHeight) / 2;
    if (Platform.OS === "android") {
      // On Android, we need to wait for the keyboardDismissMode to be updated
      // before executing this scroll. See the comment in componentDidUpdate for
      // more details
      this.setState({
        scrollToOffsetAfterSuppressingKeyboardDismissal: offset,
      });
      return;
    }
    invariant(this.flatList, "flatList should be set");
    this.flatList.scrollToOffset({ offset, animated: true });
  }

  allHeightsMeasured = (
    textToMeasure: TextToMeasure[],
    newTextHeights: Map<string, number>,
  ) => {
    if (textToMeasure !== this.state.textToMeasure) {
      return;
    }
    this.textHeights = newTextHeights;
    if (this.props.listData) {
      this.mergeHeightsIntoListData(this.props.listData);
    }
  }

  onViewableItemsChanged = (info: {
    viewableItems: ViewToken[],
    changed: ViewToken[],
  }) => {
    const visibleEntries = {};
    for (let token of info.viewableItems) {
      if (token.item.itemType === "entryInfo") {
        visibleEntries[entryKey(token.item.entryInfo)] = true;
      }
    }
    this.latestExtraData = {
      activeEntries: _pickBy(
        (_, key: string) => {
          const item = _find
            (item => item.entryInfo && entryKey(item.entryInfo) === key)
            (this.state.listDataWithHeights);
          return visibleEntries[key] || (item && !item.id);
        },
      )(this.latestExtraData.activeEntries),
      visibleEntries,
    };

    const topLoader = _find({ key: "TopLoader" })(info.viewableItems);
    const bottomLoader = _find({ key: "BottomLoader" })(info.viewableItems);
    if (!this.loadingFromScroll) {
      if (this.topLoaderWaitingToLeaveView && !topLoader) {
        this.topLoaderWaitingToLeaveView = false;
      }
      if (this.bottomLoaderWaitingToLeaveView && !bottomLoader) {
        this.bottomLoaderWaitingToLeaveView = false;
      }
    }

    if (
      !this.state.readyToShowList &&
      !this.topLoaderWaitingToLeaveView &&
      !this.bottomLoaderWaitingToLeaveView &&
      info.viewableItems.length > 0
    ) {
      this.setState({
        readyToShowList: true,
        extraData: this.latestExtraData,
      });
    }

    let start: ?Date = null;
    let end: ?Date = null;
    if (topLoader && !this.topLoaderWaitingToLeaveView) {
      this.topLoaderWaitingToLeaveView = true;
      start = dateFromString(this.props.startDate);
      start.setDate(start.getDate() - 31);
      end = dateFromString(this.props.startDate);
      end.setDate(end.getDate() - 1);
    } else if (bottomLoader && !this.bottomLoaderWaitingToLeaveView) {
      this.bottomLoaderWaitingToLeaveView = true;
      start = dateFromString(this.props.endDate);
      start.setDate(start.getDate() + 1);
      end = dateFromString(this.props.endDate);
      end.setDate(end.getDate() + 31);
    } else {
      return;
    }
    this.loadingFromScroll = true;
    this.props.dispatchActionPromise(
      fetchEntriesAndAppendRangeActionTypes,
      this.props.fetchEntriesWithRange({
        navID: this.props.simpleNavID,
        startDate: dateString(start),
        endDate: dateString(end),
      }),
    );
  }

  onScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    this.currentScrollPosition = event.nativeEvent.contentOffset.y;
  }

  // When the user "flicks" the scroll view, this callback gets triggered after
  // the scrolling ends
  onMomentumScrollEnd = () => {
    this.setState({ extraData: this.latestExtraData });
  }

  // This callback gets triggered when the user lets go of scrolling the scroll
  // view, regardless of whether it was a "flick" or a pan
  onScrollEndDrag = () => {
    // We need to figure out if this was a flick or not. If it's a flick, we'll
    // let onMomentumScrollEnd handle it once scroll position stabilizes
    const currentScrollPosition = this.currentScrollPosition;
    setTimeout(
      () => {
        if (this.currentScrollPosition === currentScrollPosition) {
          this.setState({ extraData: this.latestExtraData });
        }
      },
      50,
    );
  }

  closePicker = () => {
    this.setState({ threadPickerOpen: false });
  }

  onSaveEntry = () => {
    const entryKeys = Object.keys(this.latestExtraData.activeEntries);
    if (entryKeys.length === 0) {
      return;
    }
    const entryKey = entryKeys[0];
    const entryRef = this.entryRefs.get(entryKey);
    if (entryRef) {
      entryRef.save();
    }
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
  },
  flatList: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  sectionHeader: {
    height: 31,
    backgroundColor: '#EEEEEE',
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
  },
  sectionHeaderText: {
    padding: 5,
    fontWeight: 'bold',
    color: '#555555',
  },
  loadingIndicator: {
    flex: 1,
  },
  loadingIndicatorContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});

registerFetchKey(fetchEntriesAndAppendRangeActionTypes);

const CalendarRouteName = 'Calendar';
const activeTabSelector = createActiveTabSelector(CalendarRouteName);
const Calendar = connect(
  (state: AppState) => ({
    listData: calendarListData(state),
    tabActive: activeTabSelector(state),
    sessionID: state.sessionID,
    sessionExpired: sessionExpired(state),
    startDate: state.navInfo.startDate,
    endDate: state.navInfo.endDate,
    simpleNavID: simpleNavID(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ fetchEntriesWithRange }),
)(InnerCalendar);

export {
  Calendar,
  CalendarRouteName,
};
