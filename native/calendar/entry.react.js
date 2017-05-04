// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { AppState } from '../redux-setup';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import { colorIsDark } from 'lib/selectors/calendar-selectors';

class Entry extends React.PureComponent {
  
  props: {
    entryInfo: EntryInfo,
    calendarInfo: CalendarInfo,
  };
  static propTypes = {
    entryInfo: entryInfoPropType,
    calendarInfo: calendarInfoPropType,
  };

  render() {
    const entryStyle = {
      backgroundColor: `#${this.props.calendarInfo.color}`,
    };
    const textStyle = {
      color: colorIsDark(this.props.calendarInfo.color) ? 'white' : 'black',
    };
    return (
      <View style={styles.container}>
        <View style={[styles.entry, entryStyle]}>
          <Text style={[styles.text, textStyle]}>
            {this.props.entryInfo.text}
          </Text>
        </View>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    marginLeft: 5,
    marginRight: 5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  entry: {
    borderRadius: 8,
    margin: 5,
    overflow: 'hidden',
  },
  text: {
    padding: 5,
    color: '#333333',
  },
});

export default connect(
  (state: AppState, ownProps: { entryInfo: EntryInfo }) => ({
    calendarInfo: state.calendarInfos[ownProps.entryInfo.calendarID],
  }),
)(Entry);
