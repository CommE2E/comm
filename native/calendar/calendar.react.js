// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { AppState } from '../redux-setup';
import type { CalendarItem } from '../selectors/entry-selectors';
import type { SectionBase } from '../react-native-types';

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  SectionList,
  AppState as NativeAppState,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import _isEqual from 'lodash/fp/isEqual';
import _map from 'lodash/fp/map';

import { entryKey } from 'lib/shared/entry-utils';
import { dateString, prettyDate } from 'lib/utils/date-utils';
import { sessionExpired } from 'lib/selectors/session-selectors';

import Entry from './entry.react';
import { contentVerticalOffset } from '../dimensions';
import { calendarSectionListData } from '../selectors/entry-selectors';
import { Button } from '../shared-components';
import { createActiveTabSelector } from '../selectors/nav-selectors';
import TextHeightMeasurer from '../text-height-measurer.react';

type Section = SectionBase<CalendarItem>;
export type EntryInfoWithHeight = EntryInfo & { textHeight: number };
export type CalendarItemWithHeight = {
  entryInfo?: EntryInfoWithHeight,
  footerForDateString?: string,
};
type SectionWithHeights = SectionBase<CalendarItemWithHeight>;
type Props = {
  sectionListData: $ReadOnlyArray<Section>,
  tabActive: bool,
  sessionID: string,
  sessionExpired: () => bool,
};
class InnerCalendar extends React.PureComponent {

  props: Props;
  state: {
    textToMeasure: string[],
    sectionListDataWithHeights: ?$ReadOnlyArray<SectionWithHeights>,
    readyToShowSectionList: bool,
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
    };
  }

  static textToMeasureFromSectionListData(
    sectionListData: $ReadOnlyArray<Section>,
  ) {
    const textToMeasure = [];
    for (let section of sectionListData) {
      for (let item of section.data) {
        if (item.entryInfo) {
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
  }

  mergeHeightsIntoSectionListData(
    sectionListData: $ReadOnlyArray<Section>
  ) {
    const sectionListDataWithHeights = _map((section: Section) => ({
      ...section,
      data: _map((calendarItem: CalendarItem) => {
        if (calendarItem.footerForDateString) {
          return calendarItem;
        }
        const entryInfo = calendarItem.entryInfo;
        invariant(entryInfo, "entryInfo should be set");
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
    const sectionList = this.sectionList;
    invariant(sectionList, "sectionList should be set");
    setTimeout(
      () => {
        sectionList.scrollToLocation({
          sectionIndex: todayIndex,
          itemIndex: 0,
          animated,
          viewPosition: 0.5,
          viewOffset: 29,
        });
        setTimeout(
          () => this.setState({ readyToShowSectionList: true }),
          50,
        );
      },
      550,
    );
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

  static keyExtractor = (item: CalendarItem) => {
    if (item.entryInfo) {
      return entryKey(item.entryInfo);
    } else {
      invariant(item.footerForDateString, "should be set");
      return item.footerForDateString + "/footer";
    }
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
    if (calendarItem.footerForDateString) {
      // handle section footer
      return 40;
    }
    // handle entry
    const entryInfo = calendarItem.entryInfo;
    invariant(entryInfo, "should be set");
    return 20 + entryInfo.textHeight;
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
          style={[styles.sectionList, sectionListStyle]}
          onLayout={this.onSectionListLayout}
          ref={this.sectionListRef}
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
});

const CalendarRouteName = 'Calendar';
const activeTabSelector = createActiveTabSelector(CalendarRouteName);
const Calendar = connect(
  (state: AppState) => ({
    sectionListData: calendarSectionListData(state),
    tabActive: activeTabSelector(state),
    sessionID: state.sessionID,
    sessionExpired: sessionExpired(state),
  }),
)(InnerCalendar);

export {
  Calendar,
  CalendarRouteName,
};
