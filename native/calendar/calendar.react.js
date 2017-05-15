// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { AppState } from '../redux-setup';
import type { CalendarItem } from '../selectors/entry-selectors';
import type { SectionBase } from '../react-native-types';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { CalendarResult } from 'lib/actions/entry-actions';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  SectionList,
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
import { calendarSectionListData } from '../selectors/entry-selectors';
import { createActiveTabSelector } from '../selectors/nav-selectors';
import TextHeightMeasurer from '../text-height-measurer.react';
import ListLoadingIndicator from './list-loading-indicator.react';
import SectionFooter from './section-footer.react';

type Section = SectionBase<CalendarItem>;
export type EntryInfoWithHeight = EntryInfo & { textHeight: number };
export type CalendarItemWithHeight =
  {
    itemType: "entryInfo",
    entryInfo: EntryInfoWithHeight,
  } | {
    itemType: "footer",
    dateString: string,
  };
type SectionWithHeights = SectionBase<CalendarItemWithHeight> & { key: string };
type Props = {
  // Redux state
  sectionListData: ?$ReadOnlyArray<Section>,
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
  sectionListDataWithHeights: ?$ReadOnlyArray<SectionWithHeights>,
  readyToShowSectionList: bool,
  initialNumToRender: number,
};
class InnerCalendar extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
    sectionListData: PropTypes.arrayOf(PropTypes.shape({
      data: PropTypes.arrayOf(PropTypes.shape({
        itemType: PropTypes.oneOf(["entryInfo", "footer"]),
        entryInfo: entryInfoPropType,
        dateString: PropTypes.string,
      })).isRequired,
      key: PropTypes.string.isRequired,
    })),
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
  sectionList: ?SectionList<SectionWithHeights> = null;
  textHeights: ?{ [text: string]: number } = null;
  currentState: ?string = NativeAppState.currentState;
  loadingNewEntriesFromScroll = false;
  sectionListShrinking = false;
  currentScrollPosition: ?number = null;

  constructor(props: Props) {
    super(props);
    let textToMeasure = null;
    if (props.sectionListData) {
      textToMeasure = InnerCalendar.textToMeasureFromSectionListData(
        props.sectionListData,
      );
    } else {
      textToMeasure = [];
    }
    this.state = {
      textToMeasure,
      sectionListDataWithHeights: null,
      readyToShowSectionList: false,
      initialNumToRender: 31,
    };
  }

  static textToMeasureFromSectionListData(
    sectionListData: $ReadOnlyArray<Section>,
  ) {
    const textToMeasure = [];
    for (let section of sectionListData) {
      for (let item of section.data) {
        if (item.itemType === "entryInfo") {
          textToMeasure.push(item.entryInfo.text);
        }
      }
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
      this.sectionList
    ) {
      this.scrollToToday();
    }
  }

  componentWillReceiveProps(newProps: Props) {
    // When the sectionListData changes we may need to recalculate some heights
    if (newProps.sectionListData !== this.props.sectionListData) {
      const newSectionListData = newProps.sectionListData;
      if (!newSectionListData) {
        this.setState({
          textToMeasure: [],
          sectionListDataWithHeights: null,
          readyToShowSectionList: false,
        });
      } else {
        // If we had no entries and just got some we'll scroll to today
        const newTextToMeasure = InnerCalendar.textToMeasureFromSectionListData(
          newSectionListData,
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
          this.mergeHeightsIntoSectionListData(newSectionListData);
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
      this.sectionList
    ) {
      this.scrollToToday();
    }
    const lastSLDWH = prevState.sectionListDataWithHeights;
    const newSLDWH = this.state.sectionListDataWithHeights;
    if (lastSLDWH && newSLDWH) {
      if (newSLDWH.length < lastSLDWH.length) {
        // If there are fewer sections in our new data, which happens when the
        // current calendar query gets reset due to inactivity, let's reset the
        // scroll position to the center (today). Once we're done, we can allow
        // scrolling logic once again.
        setTimeout(() => this.scrollToToday(), 50);
        setTimeout(() => this.sectionListShrinking = false, 200);
      } else if (newSLDWH.length > lastSLDWH.length) {
        if (
          dateFromString(newSLDWH[1].key) < dateFromString(lastSLDWH[1].key)
        ) {
          this.updateScrollPositionAfterPrepend(lastSLDWH, newSLDWH);
        } else {
          this.loadingNewEntriesFromScroll = false;
        }
      }
    }
  }

  /**
   * When prepending list items, SectionList isn't smart about preserving scroll
   * position. If we're at the start of the list before prepending, SectionList
   * will just keep us at the front after prepending. But we want to preserve
   * the previous on-screen items, so we have to do a calculation to get the new
   * scroll position. (And deal with the inherent glitchiness of trying to time
   * that change with the items getting prepended... *sigh*.)
   */
  updateScrollPositionAfterPrepend(
    lastSLDWH: $ReadOnlyArray<SectionWithHeights>,
    newSLDWH: $ReadOnlyArray<SectionWithHeights>,
  ) {
    invariant(
      this.currentScrollPosition !== undefined &&
        this.currentScrollPosition !== null,
      "currentScrollPosition should be set",
    );
    const currentScrollPosition =
      Math.max(this.currentScrollPosition, 0);
    const existingKeys = new Set(
      _map((section: SectionWithHeights) => section.key)(lastSLDWH),
    );
    const newSections = _filter(
      (section: SectionWithHeights) => !existingKeys.has(section.key),
    )(newSLDWH);
    const heightOfNewSections =
      InnerCalendar.heightOfSections(newSections);
    const [itemIndex, sectionIndex, offset] =
      InnerCalendar.getScrollPositionParams(
        currentScrollPosition + heightOfNewSections,
        newSLDWH,
      );
    const sectionList = this.sectionList;
    invariant(sectionList, "sectionList should be set");
    sectionList.scrollToLocation({
      sectionIndex,
      itemIndex: itemIndex + 1,
      animated: false,
      viewPosition: 0,
      viewOffset: Platform.OS === "ios" ? (29 - offset) : offset * -1,
    });
    InteractionManager.runAfterInteractions(() => {
      this.loadingNewEntriesFromScroll = false;
    });
  }

  mergeHeightsIntoSectionListData(
    sectionListData: $ReadOnlyArray<Section>
  ) {
    const sectionListDataWithHeights = _map((section: Section) => ({
      ...section,
      data: _map((calendarItem: CalendarItem) => {
        if (calendarItem.itemType === "footer") {
          return calendarItem;
        }
        const entryInfo = calendarItem.entryInfo;
        invariant(this.textHeights, "textHeights should be set");
        const textHeight = this.textHeights[entryInfo.text];
        invariant(
          textHeight,
          `height for ${entryKey(entryInfo)} should be set`,
        );
        return {
          ...calendarItem,
          entryInfo: {
            ...calendarItem.entryInfo,
            textHeight,
          },
        };
      })(section.data),
    }))(sectionListData);
    if (
      this.state.sectionListDataWithHeights &&
      sectionListDataWithHeights.length <
        this.state.sectionListDataWithHeights.length
    ) {
      // We know that this is going to shrink our SectionList, which may cause
      // either of the ListLoadingIndicators to come into view. When our
      // SectionList shrinks, componentDidUpdate will trigger scrollToToday (we
      // can't do it any earlier because of SectionList weirdness). After that
      // happens, we will reset this back.
      this.sectionListShrinking = true;
    }
    if (this.state.sectionListDataWithHeights) {
      this.setState({ sectionListDataWithHeights, initialNumToRender: 0 });
    } else {
      this.setState({ sectionListDataWithHeights });
    }
  }

  scrollToToday = (animated: ?bool = undefined) => {
    if (animated === undefined) {
      animated = this.props.tabActive;
    }
    invariant(this.state.sectionListDataWithHeights, "should be set");
    const todayIndex = _findIndex(['key', dateString(new Date())])
      (this.state.sectionListDataWithHeights);
    invariant(this.sectionList, "sectionList should be set");
    this.sectionList.scrollToLocation({
      sectionIndex: todayIndex,
      itemIndex: 0,
      animated,
      viewPosition: 0.5,
      viewOffset: Platform.OS === "ios" ? 29 : 0,
    });
  }

  renderItem = (row) => {
    if (row.item.entryInfo) {
      return <Entry entryInfo={row.item.entryInfo} />;
    } else {
      return this.renderSectionFooter(row);
    }
  }

  static renderSectionHeader = (row) => {
    invariant(row.section.key, "should be set");
    if (row.section.key === "TopLoader" || row.section.key === "BottomLoader") {
      return <ListLoadingIndicator />;
    }
    let date = prettyDate(row.section.key);
    if (dateString(new Date()) === row.section.key) {
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

  renderSectionFooter = (row) => {
    // Eventually we will pass this function directly into SectionList, but
    // that functionality is only in RN master as of this time, and also there
    // is an issue (RN#13784) where empty sections don't render a footer. Also,
    // scrollToLocation doesn't take the renderSectionFooter prop into account.
    return (
      <SectionFooter dateString={row.item.dateString} onAdd={this.onAdd} />
    );
  }

  onAdd = (dayString: string) => {
    console.log(dayString);
  }

  static keyExtractor = (item: CalendarItemWithHeight | SectionWithHeights) => {
    if (item.data) {
      invariant(typeof item.key === "string", "key should be string");
      // Something having to do with onViewableItemsChanged calls keyExtractor
      // with sections. This condition should only catch sections
      return item.key;
    } else if (item.itemType === "entryInfo") {
      invariant(item.entryInfo, 'test');
      return entryKey(item.entryInfo);
    } else if (item.itemType === "footer") {
      return item.dateString + "/footer";
    }
    invariant(false, "keyExtractor could not extract key");
  }

  static getItemLayout = (
    data: $ReadOnlyArray<SectionWithHeights>,
    // each section header, section footer, and entry gets its own index
    flattenedIndex: number,
  ) => {
    let offset = 0;
    let curSectionIndex = 0;
    let curItemIndex = -1;
    for (let i = 0; i < flattenedIndex; i++) {
      offset += InnerCalendar.itemHeight(
        curItemIndex,
        data[curSectionIndex].data[curItemIndex],
        data[curSectionIndex].key,
      );
      curItemIndex++;
      if (curItemIndex === data[curSectionIndex].data.length) {
        curItemIndex = -1;
        curSectionIndex++;
      }
    }
    const length = InnerCalendar.itemHeight(
      curItemIndex,
      data[curSectionIndex].data[curItemIndex],
      data[curSectionIndex].key,
    );
    return { length, offset, index: flattenedIndex };
  }

  static itemHeight(
    itemIndex: number,
    calendarItem: ?CalendarItemWithHeight,
    sectionKey: string,
  ): number {
    // TODO test these values on Android
    if (itemIndex === -1) {
      if (sectionKey === "TopLoader" || sectionKey === "BottomLoader") {
        // handle ListLoadingIndicator
        return 56;
      } else {
        // handle section header
        return 29;
      }
    }
    invariant(calendarItem, "should be set");
    if (calendarItem.itemType === "footer") {
      // handle section footer
      return 40;
    }
    // handle Entry
    const entryInfo = calendarItem.entryInfo;
    return 20 + entryInfo.textHeight;
  }

  static getScrollPositionParams(
    currentScrollPosition: number,
    data: $ReadOnlyArray<SectionWithHeights>,
  ): [number, number, number] {
    let curPosition = 0;
    let curSectionIndex = 0;
    let curItemIndex = -1;
    while (true) {
      const curItemHeight = InnerCalendar.itemHeight(
        curItemIndex,
        data[curSectionIndex].data[curItemIndex],
        data[curSectionIndex].key,
      );
      if (curPosition + curItemHeight > currentScrollPosition) {
        break;
      }
      curPosition += curItemHeight;
      curItemIndex++;
      if (curItemIndex === data[curSectionIndex].data.length) {
        curItemIndex = -1;
        curSectionIndex++;
      }
    }
    return [curItemIndex, curSectionIndex, currentScrollPosition - curPosition];
  }

  static heightOfSections(data: $ReadOnlyArray<SectionWithHeights>): number {
    let height = 0;
    let curSectionIndex = 0;
    let curItemIndex = -1;
    while (curSectionIndex < data.length) {
      height += InnerCalendar.itemHeight(
        curItemIndex,
        data[curSectionIndex].data[curItemIndex],
        data[curSectionIndex].key,
      );
      curItemIndex++;
      if (curItemIndex === data[curSectionIndex].data.length) {
        curItemIndex = -1;
        curSectionIndex++;
      }
    }
    return height;
  }

  render() {
    const sectionListDataWithHeights = this.state.sectionListDataWithHeights;
    let sectionList = null;
    if (sectionListDataWithHeights) {
      const sectionListStyle = {
        opacity: this.state.readyToShowSectionList ? 1 : 0,
      };
      sectionList = (
        <SectionList
          sections={sectionListDataWithHeights}
          renderItem={this.renderItem}
          renderSectionHeader={InnerCalendar.renderSectionHeader}
          keyExtractor={InnerCalendar.keyExtractor}
          getItemLayout={InnerCalendar.getItemLayout}
          onLayout={this.onSectionListLayout}
          initialNumToRender={this.state.initialNumToRender}
          onViewableItemsChanged={this.onViewableItemsChanged}
          onScroll={this.onScroll}
          style={[styles.sectionList, sectionListStyle]}
          ref={this.sectionListRef}
        />
      );
    }
    let loadingIndicator = null;
    if (!sectionListDataWithHeights || !this.state.readyToShowSectionList) {
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
    return (
      <View style={styles.container}>
        <TextHeightMeasurer
          textToMeasure={this.state.textToMeasure}
          allHeightsMeasuredCallback={this.allHeightsMeasured}
          style={styles.text}
          ref={this.textHeightMeasurerRef}
        />
        {loadingIndicator}
        {sectionList}
      </View>
    );
  }

  textHeightMeasurerRef = (textHeightMeasurer: ?TextHeightMeasurer) => {
    this.textHeightMeasurer = textHeightMeasurer;
  }

  sectionListRef = (sectionList: ?SectionList<SectionWithHeights>) => {
    this.sectionList = sectionList;
  }

  onSectionListLayout = (event: SyntheticEvent) => {
    // This onLayout call should only trigger when the user logs in or starts
    // the app. We wait until now to scroll the calendar SectionList to today
    // because SectionList.scrollToLocation has some quirky behavior when you
    // call it before layout.
    this.scrollToToday(false);
    setTimeout(() => this.setState({ readyToShowSectionList: true }), 50);
  }

  allHeightsMeasured = (
    textToMeasure: string[],
    newTextHeights: { [text: string]: number },
  ) => {
    if (textToMeasure !== this.state.textToMeasure) {
      return;
    }
    this.textHeights = newTextHeights;
    if (this.props.sectionListData) {
      this.mergeHeightsIntoSectionListData(this.props.sectionListData);
    }
  }

  onViewableItemsChanged = (info: {
    viewableItems: ViewToken[],
    changed: ViewToken[],
  }) => {
    if (
      !this.state.readyToShowSectionList ||
      this.loadingNewEntriesFromScroll ||
      this.sectionListShrinking
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

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
  },
  sectionList: {
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
    sectionListData: calendarSectionListData(state),
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
