// @flow

import type { AppState } from '../redux-setup';
import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';

import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  FlatList,
  TouchableHighlight,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';

import { onScreenCalendarInfos } from 'lib/selectors/calendar-selectors';
import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions';
import { includeDispatchActionProps } from 'lib/utils/action-utils';

import ThreadPickerThread from './thread-picker-thread.react';

class ThreadPicker extends React.PureComponent {

  props: {
    dateString: string,
    close: () => void,
    // Redux state
    onScreenCalendarInfos: $ReadOnlyArray<CalendarInfo>,
    username: ?string,
    // Redux dispatch functions
    dispatchActionPayload: (actionType: string, payload: *) => void,
  };
  static propTypes = {
    dateString: PropTypes.string.isRequired,
    close: PropTypes.func.isRequired,
    onScreenCalendarInfos: PropTypes.arrayOf(calendarInfoPropType).isRequired,
    username: PropTypes.string.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  render() {
    return (
      <View style={styles.background}>
        <TouchableWithoutFeedback onPress={this.props.close}>
          <View style={styles.container} />
        </TouchableWithoutFeedback>
        <View style={styles.picker}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              Pick a thread
            </Text>
            <TouchableHighlight
              onPress={this.props.close}
              style={styles.closeButton}
              underlayColor="#CCCCCCDD"
            >
              <Icon
                name="close"
                size={16}
                color="#AAAAAA"
                style={styles.closeButtonIcon}
              />
            </TouchableHighlight>
          </View>
          <FlatList
            data={this.props.onScreenCalendarInfos}
            renderItem={this.renderItem}
            keyExtractor={ThreadPicker.keyExtractor}
            getItemLayout={ThreadPicker.getItemLayout}
            ItemSeparatorComponent={ThreadPicker.itemSeperator}
            style={styles.contents}
          />
        </View>
      </View>
    );
  }

  static keyExtractor(calendarInfo: CalendarInfo) {
    return calendarInfo.id;
  }

  renderItem = (row: { item: CalendarInfo }) => {
    return (
      <ThreadPickerThread
        calendarInfo={row.item}
        threadPicked={this.threadPicked}
      />
    );
  }

  static getItemLayout(data: $ReadOnlyArray<CalendarInfo>, index: number) {
    return { length: 24, offset: 24 * index, index };
  }

  static itemSeperator() {
    return <View style={styles.itemSeperator} />;
  }

  threadPicked = (threadID: string) => {
    this.props.close();
    this.props.dispatchActionPayload(
      createLocalEntryActionType,
      createLocalEntry(threadID, this.props.dateString, this.props.username),
    );
  }

}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#CCCCCCAA',
  },
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  picker: {
    flex: 1,
    marginLeft: 15,
    marginRight: 15,
    marginTop: 100,
    marginBottom: 100,
    borderRadius: 5,
    backgroundColor: '#EEEEEE',
  },
  header: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#CCCCCC',
    paddingTop: 15,
    paddingBottom: 14,
  },
  headerText: {
    fontSize: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333333',
  },
  contents: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  closeButtonIcon: {
    position: 'absolute',
    left: 3,
  },
  itemSeperator: {
    height: 1,
    backgroundColor: '#CCCCCC',
  },
});

export default connect(
  (state: AppState) => ({
    onScreenCalendarInfos: onScreenCalendarInfos(state),
    username: state.userInfo && state.userInfo.username,
  }),
  includeDispatchActionProps({ dispatchActionPayload: true }),
)(ThreadPicker);
