// @flow

import type { CalendarInfo } from 'lib/model/calendar-info';
import { calendarInfoPropType } from 'lib/model/calendar-info';
import type { AppState } from '../redux-types';

import React from 'react';
import { connect } from 'react-redux';
import invariant from 'invariant';

import { onScreenCalendarInfos } from 'lib/shared/calendar-utils';

import css from '../style.css';
import { LeftPager, RightPager } from '../vectors.react';
import { htmlTargetFromEvent } from '../vector-utils';

type Props = {
  onScreenCalendarInfos: CalendarInfo[],
  createNewEntry: (calendarID: string) => void,
  closePicker: () => void,
};
type State = {
  currentPage: number,
};

class CalendarPicker extends React.Component {

  static pageSize = 5;

  props: Props;
  state: State;
  pickerDiv: ?HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      currentPage: 0,
    };
    invariant(
      props.onScreenCalendarInfos.length > 0,
      "CalendarPicker can't be open when onScreenCalendarInfos is empty",
    );
  }

  componentDidMount() {
    invariant(this.pickerDiv, "pickerDiv ref unset");
    this.pickerDiv.focus();
  }

  render() {
    const length = this.props.onScreenCalendarInfos.length;
    invariant(
      length > 0,
      "CalendarPicker can't be open when onScreenCalendarInfos is empty",
    );
    const firstIndex = CalendarPicker.pageSize * this.state.currentPage;
    const secondIndex = Math.min(
      CalendarPicker.pageSize * (this.state.currentPage + 1),
      length,
    );

    let pager = null;
    if (length > CalendarPicker.pageSize) {
      let leftPager = (
        <LeftPager className={css['calendar-picker-pager-svg']} />
      );
      if (this.state.currentPage > 0) {
        leftPager = (
          <a
            href="#"
            className={css['calendar-picker-pager-button']}
            onClick={this.onBackPagerClick.bind(this)}
          >{leftPager}</a>
        );
      }
      let rightPager = (
        <RightPager className={css['calendar-picker-pager-svg']} />
      );
      if (CalendarPicker.pageSize * (this.state.currentPage + 1) < length) {
        rightPager = (
          <a
            href="#"
            className={css['calendar-picker-pager-button']}
            onClick={this.onNextPagerClick.bind(this)}
          >{rightPager}</a>
        );
      }
      pager = (
        <div className={css['calendar-picker-pager-container']} key="pager">
          <div className={css['calendar-picker-pager']}>
            {leftPager}
            <span className={css['calendar-picker-pager-status']}>
              {`${firstIndex + 1}–${secondIndex} of ${length}`}
            </span>
            {rightPager}
          </div>
        </div>
      );
    }

    const options = this.props.onScreenCalendarInfos
      .slice(firstIndex, secondIndex)
      .map((calendarInfo) => {
        const style = { backgroundColor: "#" + calendarInfo.color };
        return (
          <div
            className={css['pick-calendar-option']}
            key={calendarInfo.id}
            onClick={() => this.props.createNewEntry(calendarInfo.id)}
          >
            <span className={css['select-calendar']}>
              <div className={css['color-preview']} style={style} />
              <span className={css['select-calendar-name']}>
                {calendarInfo.name}
              </span>
            </span>
          </div>
        );
      });

    return (
      <div
        className={css['pick-calendar']}
        tabIndex="0"
        onBlur={this.props.closePicker}
        onKeyDown={this.onPickerKeyDown.bind(this)}
        onMouseDown={this.onMouseDown.bind(this)}
        ref={(elem) => this.pickerDiv = elem}
      >
        {options}
        {pager}
      </div>
    );
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onPickerKeyDown(event: any) {
    if (event.keyCode === 27) { // Esc
      this.props.closePicker();
    }
  }

  onMouseDown(event: SyntheticEvent) {
    const target = htmlTargetFromEvent(event);
    invariant(this.pickerDiv, "pickerDiv ref not set");
    if (this.pickerDiv.contains(target)) {
      // This prevents onBlur from firing
      event.preventDefault();
    }
  }

  onBackPagerClick(event: SyntheticEvent) {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        prevState.currentPage > 0,
        "can't go back from 0",
      );
      return { currentPage: prevState.currentPage - 1 };
    });
  }

  onNextPagerClick(event: SyntheticEvent) {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        CalendarPicker.pageSize * (prevState.currentPage + 1)
          < props.onScreenCalendarInfos.length,
        "page is too high",
      );
      return { currentPage: prevState.currentPage + 1 };
    });
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
