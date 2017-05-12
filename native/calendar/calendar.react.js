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
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import _isEqual from 'lodash/fp/isEqual';
import _map from 'lodash/fp/map';
import _find from 'lodash/fp/find';

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
import { Button } from '../shared-components';
import { createActiveTabSelector } from '../selectors/nav-selectors';
import TextHeightMeasurer from '../text-height-measurer.react';
import ListLoadingIndicator from './list-loading-indicator.react';

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
type SectionWithHeights = SectionBase<CalendarItemWithHeight>;
type Props = {
  // Redux state
  sectionListData: $ReadOnlyArray<Section>,
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
class InnerCalendar extends React.PureComponent {

  props: Props;
  state: {
    textToMeasure: string[],
    sectionListDataWithHeights: ?$ReadOnlyArray<SectionWithHeights>,
    readyToShowSectionList: bool,
    newStartDate: string,
    newEndDate: string,
  };
  static propTypes = {
    sectionListData: PropTypes.arrayOf(PropTypes.shape({
      data: PropTypes.arrayOf(PropTypes.shape({
        entryInfo: entryInfoPropType,
        footerForDateString: PropTypes.string,
      })).isRequired,
      key: PropTypes.string.isRequired,
    })).isRequired,
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
  queuedScrollToToday = true;

  constructor(props: Props) {
    super(props);
    const textToMeasure = InnerCalendar.textToMeasureFromSectionListData(
      props.sectionListData,
    );
    this.state = {
      textToMeasure,
      sectionListDataWithHeights: null,
      readyToShowSectionList: false,
      newStartDate: this.props.startDate,
      newEndDate: this.props.endDate,
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
    // If the sessionID gets reset and the user isn't looking we scroll to today
    if (
      newProps.sessionID !== this.props.sessionID &&
      !newProps.tabActive &&
      this.sectionList
    ) {
      this.scrollToToday(false);
    }
    // When the sectionListData changes we may need to recalculate some heights
    if (newProps.sectionListData !== this.props.sectionListData) {
      // If we had no entries and just got some we'll scroll to today
      if (!this.queuedScrollToToday) {
        this.queuedScrollToToday = this.state.textToMeasure.length === 0;
      }
      const newTextToMeasure = InnerCalendar.textToMeasureFromSectionListData(
        newProps.sectionListData,
      );
      if (!_isEqual(this.state.textToMeasure)(newTextToMeasure)) {
        // In this case, we have new text and need to measure its height
        this.textHeights = null;
        this.setState({ textToMeasure: newTextToMeasure });
      } else if (this.textHeights) {
        // In this case, we already have the height of all the text
        this.mergeHeightsIntoSectionListData(newProps.sectionListData);
      } else {
        // In this case, the text is unchanged but we don't have its height yet
        // We don't do anything since we're still waiting on the text
      }
    }
    if (newProps.startDate !== this.state.newStartDate) {
      this.setState({ newStartDate: newProps.startDate });
    }
    if (newProps.endDate !== this.state.newEndDate) {
      this.setState({ newEndDate: newProps.endDate });
    }
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
    this.setState({ sectionListDataWithHeights });
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
    setTimeout(() => this.setState({ readyToShowSectionList: true }), 50);
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
    // is an issue (RN#13784) where empty sections don't render a footer.
    return (
      <View style={styles.sectionFooter}>
        <Button
          onSubmit={() => this.onAdd(row.item.footerForDateString)}
          style={styles.addButton}
        >
          <View style={styles.addButtonContents}>
            <Icon name="plus" style={styles.addIcon} />
            <Text style={styles.actionLinksText}>Add</Text>
          </View>
        </Button>
      </View>
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
    );
    return { length, offset, index: flattenedIndex };
  }

  static itemHeight(
    itemIndex: number,
    calendarItem: ?CalendarItemWithHeight,
  ): number {
    // TODO test these values on Android
    if (itemIndex === -1) {
      // handle section header
      return 29;
    }
    invariant(calendarItem, "should be set");
    if (calendarItem.itemType === "footer") {
      // handle section footer
      return 40;
    }
    // handle entry
    const entryInfo = calendarItem.entryInfo;
    return 20 + entryInfo.textHeight;
  }

  render() {
    const sectionListDataWithHeights = this.state.sectionListDataWithHeights;
    let sectionList = null;
    if (sectionListDataWithHeights) {
      const sectionListStyle = {
        opacity: this.state.readyToShowSectionList ? 1 : 0,
      };
      const ListHeaderComponent =
        this.state.newStartDate === this.props.startDate
          ? undefined
          : ListLoadingIndicator;
      const ListFooterComponent =
        this.state.newEndDate === this.props.endDate
          ? undefined
          : ListLoadingIndicator;
      sectionList = (
        <SectionList
          sections={sectionListDataWithHeights}
          renderItem={this.renderItem}
          renderSectionHeader={InnerCalendar.renderSectionHeader}
          keyExtractor={InnerCalendar.keyExtractor}
          getItemLayout={InnerCalendar.getItemLayout}
          onLayout={this.onSectionListLayout}
          initialNumToRender={31}
          onViewableItemsChanged={this.onViewableItemsChanged}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
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
    invariant(this.sectionList, "should be set");
    if (this.queuedScrollToToday) {
      this.scrollToToday(false);
      this.queuedScrollToToday = false;
    } else {
      this.setState({ readyToShowSectionList: true });
    }
  }

  allHeightsMeasured = (
    textToMeasure: string[],
    newTextHeights: { [text: string]: number },
  ) => {
    if (textToMeasure !== this.state.textToMeasure) {
      return;
    }
    this.textHeights = newTextHeights;
    this.mergeHeightsIntoSectionListData(this.props.sectionListData);
  }

  onViewableItemsChanged = (info: {
    viewableItems: ViewToken[],
    changed: ViewToken[],
  }) => {
    if (!this.state.readyToShowSectionList) {
      return;
    }
    const firstItem =
      _find({ key: this.state.newStartDate })(info.viewableItems);
    const lastItem = _find({ key: this.state.newEndDate })(info.viewableItems);
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
    }
    if (!start || !end) {
      return;
    }
    const startDate = dateString(start);
    const endDate = dateString(end);
    if (firstItem) {
      this.setState({ newStartDate: startDate });
    } else if (lastItem) {
      this.setState({ newEndDate: endDate });
    }
    this.props.dispatchActionPromise(
      fetchEntriesAndAppendRangeActionType,
      this.props.fetchEntriesWithRange({
        navID: this.props.simpleNavID,
        startDate,
        endDate,
      }),
    );
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
  sectionFooter: {
    backgroundColor: 'white',
    height: 40,
  },
  addButton: {
    position: 'absolute',
    backgroundColor: '#EEEEEE',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 5,
    margin: 5,
  },
  addButtonContents: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 14,
    paddingRight: 6,
    color: '#555555',
  },
  actionLinksText: {
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
