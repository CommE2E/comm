// @flow

import invariant from 'invariant';
import * as React from 'react';

import { onScreenEntryEditableThreadInfos } from 'lib/selectors/thread-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import { htmlTargetFromEvent } from '../vector-utils';
import { LeftPager, RightPager } from '../vectors.react';
import css from './thread-picker.css';

type OptionProps = {|
  +threadInfo: ThreadInfo,
  +createNewEntry: (threadID: string) => void,
|};
function ThreadPickerOption(props: OptionProps) {
  const { threadInfo, createNewEntry } = props;
  const onClick = React.useCallback(() => createNewEntry(threadInfo.id), [
    threadInfo.id,
    createNewEntry,
  ]);
  const colorStyle = { backgroundColor: `#${props.threadInfo.color}` };

  return (
    <div className={css.option} onClick={onClick}>
      <span className={css.thread}>
        <div className={css.colorPreview} style={colorStyle} />
        <span className={css.threadName}>{props.threadInfo.uiName}</span>
      </span>
    </div>
  );
}

type BaseProps = {|
  +createNewEntry: (threadID: string) => void,
  +closePicker: () => void,
|};
type Props = {|
  ...BaseProps,
  +onScreenThreadInfos: $ReadOnlyArray<ThreadInfo>,
|};
type State = {|
  +currentPage: number,
|};

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
    invariant(this.pickerDiv, 'pickerDiv ref unset');
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
      let leftPager = <LeftPager className={css.pagerIcon} />;
      if (this.state.currentPage > 0) {
        leftPager = (
          <a
            href="#"
            className={css.pagerButton}
            onClick={this.onBackPagerClick}
          >
            {leftPager}
          </a>
        );
      }
      let rightPager = <RightPager className={css.pagerIcon} />;
      if (ThreadPicker.pageSize * (this.state.currentPage + 1) < length) {
        rightPager = (
          <a
            href="#"
            className={css.pagerButton}
            onClick={this.onNextPagerClick}
          >
            {rightPager}
          </a>
        );
      }
      pager = (
        <div className={css.pagerContainer} key="pager">
          <div className={css.pager}>
            {leftPager}
            <span className={css.pagerStatus}>
              {`${firstIndex + 1}–${secondIndex} of ${length}`}
            </span>
            {rightPager}
          </div>
        </div>
      );
    }

    const options = this.props.onScreenThreadInfos
      .slice(firstIndex, secondIndex)
      .map(threadInfo => (
        <ThreadPickerOption
          threadInfo={threadInfo}
          createNewEntry={this.props.createNewEntry}
          key={threadInfo.id}
        />
      ));

    return (
      <div
        className={css.container}
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
  };

  onPickerKeyDown = (event: SyntheticKeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 27) {
      // Esc
      this.props.closePicker();
    }
  };

  onMouseDown = (event: SyntheticEvent<HTMLDivElement>) => {
    const target = htmlTargetFromEvent(event);
    invariant(this.pickerDiv, 'pickerDiv ref not set');
    if (this.pickerDiv.contains(target)) {
      // This prevents onBlur from firing
      event.preventDefault();
    }
  };

  onBackPagerClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState(prevState => {
      invariant(prevState.currentPage > 0, "can't go back from 0");
      return { currentPage: prevState.currentPage - 1 };
    });
  };

  onNextPagerClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        ThreadPicker.pageSize * (prevState.currentPage + 1) <
          props.onScreenThreadInfos.length,
        'page is too high',
      );
      return { currentPage: prevState.currentPage + 1 };
    });
  };
}

export default React.memo<BaseProps>(function ConnectedThreadPicker(
  props: BaseProps,
) {
  const onScreenThreadInfos = useSelector(onScreenEntryEditableThreadInfos);
  return <ThreadPicker {...props} onScreenThreadInfos={onScreenThreadInfos} />;
});
