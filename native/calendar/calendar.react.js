// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { AppState } from '../redux-setup';
import type { CalendarItem } from '../selectors/entry-selectors';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { CalendarResult } from 'lib/actions/entry-actions';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  AppState as NativeAppState,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import _isEqual from 'lodash/fp/isEqual';
import _map from 'lodash/fp/map';
import _find from 'lodash/fp/find';
import _difference from 'lodash/fp/difference';
import _filter from 'lodash/fp/filter';
import _sum from 'lodash/fp/sum';
import _pick from 'lodash/fp/pick';
import _size from 'lodash/fp/size';
import _compact from 'lodash/fp/compact';

import { entryKey } from 'lib/shared/entry-utils';
import { dateString, prettyDate, dateFromString } from 'lib/utils/date-utils';
import { sessionExpired } from 'lib/selectors/session-selectors';
import {
  fetchEntriesAndAppendRangeActionType,
  fetchEntriesWithRange,
} from 'lib/actions/entry-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { simpleNavID } from 'lib/selectors/nav-selectors';

import Entry from './entry.react';
import { contentVerticalOffset } from '../dimensions';
import { calendarListData } from '../selectors/entry-selectors';
import { createActiveTabSelector } from '../selectors/nav-selectors';
import TextHeightMeasurer from '../text-height-measurer.react';
import ListLoadingIndicator from './list-loading-indicator.react';
import SectionFooter from './section-footer.react';
import ThreadPicker from './thread-picker.react';

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
type Props = {
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
  textToMeasure: string[],
  listDataWithHeights: ?$ReadOnlyArray<CalendarItemWithHeight>,
  readyToShowList: bool,
  initialNumToRender: number,
  pickerOpenForDateString: ?string,
  focusedEntries: {[key: string]: bool},
};
const viewabilityConfig = {
  viewAreaCoveragePercentThreshold: 100,
  waitForInteraction: true,
};
class InnerCalendar extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
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
  };
  textHeightMeasurer: ?TextHeightMeasurer = null;
  flatList: ?FlatList<CalendarItemWithHeight> = null;
  textHeights: ?{ [text: string]: number } = null;
  currentState: ?string = NativeAppState.currentState;
  loadingNewEntriesFromScroll = false;
  listShrinking = false;
  currentScrollPosition: ?number = null;

  constructor(props: Props) {
    super(props);
    const textToMeasure = props.listData
      ? InnerCalendar.textToMeasureFromListData(props.listData)
      : [];
    this.state = {
      textToMeasure,
      listDataWithHeights: null,
      readyToShowList: false,
      initialNumToRender: 31,
      pickerOpenForDateString: null,
      focusedEntries: {},
    };
  }

  static textToMeasureFromListData(listData: $ReadOnlyArray<CalendarItem>) {
    const textToMeasure = [];
    for (let item of listData) {
      if (item.itemType !== "entryInfo") {
        continue;
      }
      textToMeasure.push(item.entryInfo.text);
    }
    return textToMeasure;
  }

  componentDidMount() {
    NativeAppState.addEventListener('change', this.handleAppStateChange);
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
      this.flatList
    ) {
      this.scrollToToday();
    }
  }

  componentWillReceiveProps(newProps: Props) {
    // When the listData changes we may need to recalculate some heights
    if (newProps.listData !== this.props.listData) {
      const newListData = newProps.listData;
      if (!newListData) {
        this.setState({
          textToMeasure: [],
          listDataWithHeights: null,
          readyToShowList: false,
          focusedEntries: {},
        });
      } else {
        // If we had no entries and just got some we'll scroll to today
        const newTextToMeasure = InnerCalendar.textToMeasureFromListData(
          newListData,
        );

        let allTextAlreadyMeasured = false;
        if (this.textHeights) {
          allTextAlreadyMeasured = true;
          for (let text of newTextToMeasure) {
            if (this.textHeights[text] === undefined) {
              allTextAlreadyMeasured = false;
              break;
            }
          }
        }

        if (allTextAlreadyMeasured) {
          this.mergeHeightsIntoListData(newListData);
        } else {
          const newText =
            _difference(newTextToMeasure)(this.state.textToMeasure);
          if (newText.length === 0) {
            // Since we don't have everything in textHeights, but we do have
            // everything in textToMeasure, we can conclude that we're just
            // waiting for the measurement to complete and then we'll be good.
          } else {
            // We set textHeights to null here since if a future set of text
            // came in before we completed text measurement that was a subset
            // of the earlier text, we would end up merging directly there, but
            // then when the measurement for the middle text came in it would
            // override the newer text heights.
            this.textHeights = null;
            this.setState({ textToMeasure: newTextToMeasure });
          }
        }
      }
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // If the sessionID gets reset and the user isn't looking we scroll to today
    if (
      this.props.sessionID !== prevProps.sessionID &&
      !this.props.tabActive &&
      this.flatList
    ) {
      this.scrollToToday();
    }

    const lastLDWH = prevState.listDataWithHeights;
    const newLDWH = this.state.listDataWithHeights;
    if (!lastLDWH || !newLDWH) {
      return;
    }

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

    if (newStartDate > lastStartDate || newEndDate < lastEndDate) {
      // If there are fewer items in our new data, which happens when the
      // current calendar query gets reset due to inactivity, let's reset the
      // scroll position to the center (today). Once we're done, we can allow
      // scrolling logic once again.
      setTimeout(() => this.scrollToToday(), 50);
      setTimeout(() => this.listShrinking = false, 200);
    } else if (newStartDate < lastStartDate) {
      this.updateScrollPositionAfterPrepend(lastLDWH, newLDWH);
    } else if (newEndDate > lastEndDate) {
      this.loadingNewEntriesFromScroll = false;
    }
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
    const existingKeys = new Set(
      _map((item: CalendarItemWithHeight) => InnerCalendar.keyExtractor(item))
        (lastLDWH),
    );
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
      if (Platform.OS === "android") {
        // I am not sure why we do this. I have no idea what's going on.
        offset += 74;
      }
      flatList.scrollToOffset({
        offset,
        animated: false,
      });
    };
    if (Platform.OS === "android") {
      setTimeout(scrollAction, 0);
    } else {
      scrollAction();
    }
    setTimeout(() => this.loadingNewEntriesFromScroll = false, 1000);
  }

  mergeHeightsIntoListData(listData: $ReadOnlyArray<CalendarItem>) {
    const listDataWithHeights = _map((item: CalendarItem) => {
      if (item.itemType !== "entryInfo") {
        return item;
      }
      const entryInfo = item.entryInfo;
      invariant(this.textHeights, "textHeights should be set");
      const textHeight = this.textHeights[entryInfo.text];
      invariant(
        textHeight,
        `height for ${entryKey(entryInfo)} should be set`,
      );
      return {
        ...item,
        entryInfo: {
          ...item.entryInfo,
          textHeight,
        },
      };
    })(listData);
    if (
      this.state.listDataWithHeights &&
      listDataWithHeights.length < this.state.listDataWithHeights.length
    ) {
      // We know that this is going to shrink our FlatList, which may cause
      // either of the ListLoadingIndicators to come into view. When our
      // FlatList shrinks, componentDidUpdate will trigger scrollToToday (we
      // can't do it any earlier because of FlatList weirdness). After that
      // happens, we will reset this back.
      this.listShrinking = true;
    }
    if (this.state.listDataWithHeights) {
      this.setState({ listDataWithHeights, initialNumToRender: 0 });
    } else {
      this.setState({ listDataWithHeights });
    }
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
    if (row.item.itemType === "loader") {
      return <ListLoadingIndicator />;
    } else if (row.item.itemType === "header") {
      return InnerCalendar.renderSectionHeader(row);
    } else if (row.item.itemType === "entryInfo") {
      return (
        <Entry
          entryInfo={row.item.entryInfo}
          focused={!!this.state.focusedEntries[entryKey(row.item.entryInfo)]}
          onFocus={this.onEntryFocus}
        />
      );
    } else if (row.item.itemType === "footer") {
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
    this.setState({ pickerOpenForDateString: dayString });
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
    data: $ReadOnlyArray<CalendarItemWithHeight>,
    index: number,
  ) {
    const offset =
      InnerCalendar.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? InnerCalendar.itemHeight(item) : 0;
    return { length, offset, index };
  }

  static itemHeight(item: CalendarItemWithHeight): number {
    // TODO test these values on Android
    if (item.itemType === "loader") {
      return 56;
    } else if (item.itemType === "header") {
      return 29;
    } else if (item.itemType === "entryInfo") {
      return 20 + item.entryInfo.textHeight;
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
      const flatListStyle = {
        opacity: this.state.readyToShowList ? 1 : 0,
      };
      flatList = (
        <FlatList
          data={listDataWithHeights}
          renderItem={this.renderItem}
          keyExtractor={InnerCalendar.keyExtractor}
          getItemLayout={InnerCalendar.getItemLayout}
          onLayout={this.onListLayout}
          onViewableItemsChanged={this.onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScroll={this.onScroll}
          initialNumToRender={this.state.initialNumToRender}
          extraData={this.state.focusedEntries}
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
    let picker = null;
    if (this.state.pickerOpenForDateString) {
      picker = (
        <ThreadPicker
          dateString={this.state.pickerOpenForDateString}
          close={this.closePicker}
        />
      );
    }
    return (
      <View style={styles.container}>
        <TextHeightMeasurer
          textToMeasure={this.state.textToMeasure}
          allHeightsMeasuredCallback={this.allHeightsMeasured}
          style={styles.text}
          ref={this.textHeightMeasurerRef}
        />
        {loadingIndicator}
        {flatList}
        {picker}
      </View>
    );
  }

  initialScrollIndex = () => {
    const data = this.state.listDataWithHeights;
    invariant(data, "should be set");
    return _findIndex(['dateString', dateString(new Date())])(data);
  }

  textHeightMeasurerRef = (textHeightMeasurer: ?TextHeightMeasurer) => {
    this.textHeightMeasurer = textHeightMeasurer;
  }

  flatListRef = (flatList: ?FlatList<CalendarItemWithHeight>) => {
    this.flatList = flatList;
  }

  onEntryFocus = (key: string) => {
    this.setState({ focusedEntries: { [key]: true } });
  }

  onListLayout = (event: SyntheticEvent) => {
    // This onLayout call should only trigger when the user logs in or starts
    // the app. We wait until now to scroll the calendar FlatList to today
    // because FlatList.scrollToItem has some quirky behavior when you call it
    // before layout.
    this.scrollToToday(false);
    setTimeout(() => this.setState({ readyToShowList: true }), 50);
  }

  allHeightsMeasured = (
    textToMeasure: string[],
    newTextHeights: { [text: string]: number },
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
    const viewableEntries = _compact(_map(
      (token: ViewToken) => token.item.itemType === "entryInfo"
        ? entryKey(token.item.entryInfo)
        : null,
    )(info.viewableItems));
    const newFocusedEntries = _pick(viewableEntries)(this.state.focusedEntries);
    if (_size(newFocusedEntries) < _size(this.state.focusedEntries)) {
      this.setState({ focusedEntries: newFocusedEntries });
    }

    if (
      !this.state.readyToShowList ||
      this.loadingNewEntriesFromScroll ||
      this.listShrinking
    ) {
      return;
    }
    const firstItem = _find({ key: "TopLoader" })(info.viewableItems);
    const lastItem = _find({ key: "BottomLoader" })(info.viewableItems);
    let start: ?Date = null;
    let end: ?Date = null;
    if (firstItem) {
      start = dateFromString(this.props.startDate);
      start.setDate(start.getDate() - 31);
      end = dateFromString(this.props.startDate);
      end.setDate(end.getDate() - 1);
    } else if (lastItem) {
      start = dateFromString(this.props.endDate);
      start.setDate(start.getDate() + 1);
      end = dateFromString(this.props.endDate);
      end.setDate(end.getDate() + 31);
    } else {
      return;
    }
    this.loadingNewEntriesFromScroll = true;
    this.props.dispatchActionPromise(
      fetchEntriesAndAppendRangeActionType,
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

  closePicker = () => {
    this.setState({ pickerOpenForDateString: null });
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
    marginTop: contentVerticalOffset,
  },
  sectionHeader: {
    backgroundColor: '#EEEEEE',
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
  },
  sectionHeaderText: {
    padding: 5,
    fontWeight: 'bold',
    color: '#555555',
  },
  text: {
    left: 15,
    right: 15,
    fontSize: 16,
    fontFamily: 'Arial',
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
});

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
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ fetchEntriesWithRange }),
)(InnerCalendar);

export {
  Calendar,
  CalendarRouteName,
};
