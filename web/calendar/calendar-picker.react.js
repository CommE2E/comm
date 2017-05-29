// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { AppState } from '../redux-setup';

import React from 'react';
import { connect } from 'react-redux';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { onScreenCalendarInfos } from 'lib/selectors/calendar-selectors';

import css from '../style.css';
import { LeftPager, RightPager } from '../vectors.react';
import { htmlTargetFromEvent } from '../vector-utils';

type OptionProps = {
  calendarInfo: CalendarInfo,
  createNewEntry: (threadID: string) => void,
};
class CalendarPickerOption extends React.PureComponent {

  props: OptionProps;
  style: { backgroundColor: string };

  constructor(props: OptionProps) {
    super(props);
    this.style = { backgroundColor: "#" + props.calendarInfo.color };
  }

  componentWillReceiveProps(nextProps: OptionProps) {
    this.style = { backgroundColor: "#" + nextProps.calendarInfo.color };
  }

  render() {
    return (
      <div className={css['pick-calendar-option']} onClick={this.onClick}>
        <span className={css['select-calendar']}>
          <div className={css['color-preview']} style={this.style} />
          <span className={css['select-calendar-name']}>
            {this.props.calendarInfo.name}
          </span>
        </span>
      </div>
    );
  }

  onClick = () => {
    this.props.createNewEntry(this.props.calendarInfo.id);
  }

}

type Props = {
  onScreenCalendarInfos: CalendarInfo[],
  createNewEntry: (threadID: string) => void,
  closePicker: () => void,
};
type State = {
  currentPage: number,
};

class CalendarPicker extends React.PureComponent {

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
            onClick={this.onBackPagerClick}
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
            onClick={this.onNextPagerClick}
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
      .map((calendarInfo) => (
        <CalendarPickerOption
          calendarInfo={calendarInfo}
          createNewEntry={this.props.createNewEntry}
          key={calendarInfo.id}
        />
      ));

    return (
      <div
        className={css['pick-calendar']}
        tabIndex="0"
        onBlur={this.props.closePicker}
        onKeyDown={this.onPickerKeyDown}
        onMouseDown={this.onMouseDown}
        ref={this.pickerDivRef}
      >
        {options}
        {pager}
      </div>
    );
  }

  pickerDivRef = (pickerDiv: ?HTMLDivElement) => {
    this.pickerDiv = pickerDiv;
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onPickerKeyDown = (event: any) => {
    if (event.keyCode === 27) { // Esc
      this.props.closePicker();
    }
  }

  onMouseDown = (event: SyntheticEvent) => {
    const target = htmlTargetFromEvent(event);
    invariant(this.pickerDiv, "pickerDiv ref not set");
    if (this.pickerDiv.contains(target)) {
      // This prevents onBlur from firing
      event.preventDefault();
    }
  }

  onBackPagerClick = (event: SyntheticEvent) => {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        prevState.currentPage > 0,
        "can't go back from 0",
      );
      return { currentPage: prevState.currentPage - 1 };
    });
  }

  onNextPagerClick = (event: SyntheticEvent) => {
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
    PropTypes.arrayOf(calendarInfoPropType).isRequired,
  createNewEntry: PropTypes.func.isRequired,
  closePicker: PropTypes.func.isRequired,
};

export default connect((state: AppState) => ({
  onScreenCalendarInfos: onScreenCalendarInfos(state),
}))(CalendarPicker);
