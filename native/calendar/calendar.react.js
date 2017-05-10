// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { AppState } from '../redux-setup';
import type { CalendarItem } from '../selectors/entry-selectors';
import type { SectionBase } from '../react-native-types';

import React from 'react';
import { View, StyleSheet, Text, SectionList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import _isEqual from 'lodash/fp/isEqual';
import _map from 'lodash/fp/map';

import { entryKey } from 'lib/shared/entry-utils';
import { dateString, prettyDate } from 'lib/utils/date-utils';

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
};
class InnerCalendar extends React.PureComponent {

  props: Props;
  state: {
    textToMeasure: string[],
    sectionListDataWithHeights: ?$ReadOnlyArray<SectionWithHeights>,
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

  constructor(props: Props) {
    super(props);
    const textToMeasure = InnerCalendar.textToMeasureFromSectionListData(
      props.sectionListData,
    );
    this.state = {
      textToMeasure,
      sectionListDataWithHeights: null,
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

  componentWillReceiveProps(newProps: Props) {
    //if (this.props.tabActive && !newProps.tabActive && this.sectionList) {
    //  this.scrollToToday();
    //}
    if (newProps.sectionListData !== this.props.sectionListData) {
      const newTextToMeasure = InnerCalendar.textToMeasureFromSectionListData(
        newProps.sectionListData,
      );
      if (!_isEqual(this.state.textToMeasure)(newTextToMeasure)) {
        this.setState({ textToMeasure: newTextToMeasure });
      } else {
        this.mergeHeightsIntoSectionListData(newProps.sectionListData);
      }
    }
  }

  mergeHeightsIntoSectionListData(sectionListData: $ReadOnlyArray<Section>) {
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

  scrollToToday() {
    const todayIndex = _findIndex(['key', dateString(new Date())])
      (this.props.sectionListData);
    invariant(this.sectionList, "sectionList should be set");
    this.sectionList.scrollToLocation({
      sectionIndex: todayIndex,
      itemIndex: 0,
      viewPosition: 0.5,
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

  onAdd = (dateString: string) => {
    console.log(dateString);
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
    let sectionList = null;
    if (this.state.sectionListDataWithHeights) {
      sectionList = (
        <SectionList
          sections={this.state.sectionListDataWithHeights}
          renderItem={this.renderItem}
          renderSectionHeader={InnerCalendar.renderSectionHeader}
          keyExtractor={InnerCalendar.keyExtractor}
          getItemLayout={InnerCalendar.getItemLayout}
          style={styles.sectionList}
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

  allHeightsMeasured = (newTextHeights: { [text: string]: number }) => {
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
  }),
)(InnerCalendar);

export {
  Calendar,
  CalendarRouteName,
};
