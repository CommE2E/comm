// @flow

import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { AppState } from '../redux-reducer';

import React from 'react';
import { connect } from 'react-redux';
import invariant from 'invariant';

import { onScreenCalendarInfos } from '../calendar-utils';

type Props = {
  onScreenCalendarInfos: CalendarInfo[],
  createNewEntry: (calendarID: string) => void,
  closePicker: () => void,
};

class CalendarPicker extends React.Component {

  props: Props;
  pickerDiv: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.pickerDiv, "pickerDiv ref unset");
    this.pickerDiv.focus();
  }

  render() {
    invariant(
      this.props.onScreenCalendarInfos.length > 0,
      "CalendarPicker can't be open when onScreenCalendarInfos is empty",
    );
    const options = this.props.onScreenCalendarInfos.map((calendarInfo) => {
      const style = { backgroundColor: "#" + calendarInfo.color };
      return (
        <div
          key={calendarInfo.id}
          onClick={() => this.props.createNewEntry(calendarInfo.id)}
        >
          <span className="select-calendar">
            <div className="color-preview" style={style} />
            <span className="select-calendar-name">{calendarInfo.name}</span>
          </span>
        </div>
      );
    });
    return (
      <div
        className="pick-calendar"
        tabIndex="0"
        onBlur={this.props.closePicker}
        onKeyDown={this.onPickerKeyDown.bind(this)}
        ref={(elem) => this.pickerDiv = elem}
      >{options}</div>
    );
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onPickerKeyDown(event: any) {
    if (event.keyCode === 27) { // Esc
      this.props.closePicker();
    }
  }

}

CalendarPicker.propTypes = {
  onScreenCalendarInfos:
    React.PropTypes.arrayOf(calendarInfoPropType).isRequired,
  createNewEntry: React.PropTypes.func.isRequired,
  closePicker: React.PropTypes.func.isRequired,
};

export default connect((state: AppState) => ({
  onScreenCalendarInfos: onScreenCalendarInfos(state),
}))(CalendarPicker);
