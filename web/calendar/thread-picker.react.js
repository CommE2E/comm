// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import {
  onScreenEntryEditableThreadInfos,
} from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import css from '../style.css';
import { LeftPager, RightPager } from '../vectors.react';
import { htmlTargetFromEvent } from '../vector-utils';

type OptionProps = {
  threadInfo: ThreadInfo,
  createNewEntry: (threadID: string) => void,
};
class ThreadPickerOption extends React.PureComponent<OptionProps> {

  style: { backgroundColor: string };

  constructor(props: OptionProps) {
    super(props);
    this.style = { backgroundColor: "#" + props.threadInfo.color };
  }

  componentWillReceiveProps(nextProps: OptionProps) {
    this.style = { backgroundColor: "#" + nextProps.threadInfo.color };
  }

  render() {
    return (
      <div className={css['pick-thread-option']} onClick={this.onClick}>
        <span className={css['select-thread']}>
          <div className={css['color-preview']} style={this.style} />
          <span className={css['select-thread-name']}>
            {this.props.threadInfo.uiName}
          </span>
        </span>
      </div>
    );
  }

  onClick = () => {
    this.props.createNewEntry(this.props.threadInfo.id);
  }

}

type Props = {
  onScreenThreadInfos: ThreadInfo[],
  createNewEntry: (threadID: string) => void,
  closePicker: () => void,
};
type State = {
  currentPage: number,
};

class ThreadPicker extends React.PureComponent<Props, State> {

  static pageSize = 5;

  pickerDiv: ?HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      currentPage: 0,
    };
    invariant(
      props.onScreenThreadInfos.length > 0,
      "ThreadPicker can't be open when onScreenThreadInfos is empty",
    );
  }

  componentDidMount() {
    invariant(this.pickerDiv, "pickerDiv ref unset");
    this.pickerDiv.focus();
  }

  render() {
    const length = this.props.onScreenThreadInfos.length;
    invariant(
      length > 0,
      "ThreadPicker can't be open when onScreenThreadInfos is empty",
    );
    const firstIndex = ThreadPicker.pageSize * this.state.currentPage;
    const secondIndex = Math.min(
      ThreadPicker.pageSize * (this.state.currentPage + 1),
      length,
    );

    let pager = null;
    if (length > ThreadPicker.pageSize) {
      let leftPager = (
        <LeftPager className={css['thread-picker-pager-svg']} />
      );
      if (this.state.currentPage > 0) {
        leftPager = (
          <a
            href="#"
            className={css['thread-picker-pager-button']}
            onClick={this.onBackPagerClick}
          >{leftPager}</a>
        );
      }
      let rightPager = (
        <RightPager className={css['thread-picker-pager-svg']} />
      );
      if (ThreadPicker.pageSize * (this.state.currentPage + 1) < length) {
        rightPager = (
          <a
            href="#"
            className={css['thread-picker-pager-button']}
            onClick={this.onNextPagerClick}
          >{rightPager}</a>
        );
      }
      pager = (
        <div className={css['thread-picker-pager-container']} key="pager">
          <div className={css['thread-picker-pager']}>
            {leftPager}
            <span className={css['thread-picker-pager-status']}>
              {`${firstIndex + 1}–${secondIndex} of ${length}`}
            </span>
            {rightPager}
          </div>
        </div>
      );
    }

    const options = this.props.onScreenThreadInfos
      .slice(firstIndex, secondIndex)
      .map((threadInfo) => (
        <ThreadPickerOption
          threadInfo={threadInfo}
          createNewEntry={this.props.createNewEntry}
          key={threadInfo.id}
        />
      ));

    return (
      <div
        className={css['pick-thread']}
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

  onPickerKeyDown = (event: SyntheticKeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 27) { // Esc
      this.props.closePicker();
    }
  }

  onMouseDown = (event: SyntheticEvent<HTMLDivElement>) => {
    const target = htmlTargetFromEvent(event);
    invariant(this.pickerDiv, "pickerDiv ref not set");
    if (this.pickerDiv.contains(target)) {
      // This prevents onBlur from firing
      event.preventDefault();
    }
  }

  onBackPagerClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        prevState.currentPage > 0,
        "can't go back from 0",
      );
      return { currentPage: prevState.currentPage - 1 };
    });
  }

  onNextPagerClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        ThreadPicker.pageSize * (prevState.currentPage + 1)
          < props.onScreenThreadInfos.length,
        "page is too high",
      );
      return { currentPage: prevState.currentPage + 1 };
    });
  }

}

ThreadPicker.propTypes = {
  onScreenThreadInfos:
    PropTypes.arrayOf(threadInfoPropType).isRequired,
  createNewEntry: PropTypes.func.isRequired,
  closePicker: PropTypes.func.isRequired,
};

export default connect((state: AppState) => ({
  onScreenThreadInfos: onScreenEntryEditableThreadInfos(state),
}))(ThreadPicker);
