// @flow

import invariant from 'invariant';
import * as React from 'react';

import { onScreenEntryEditableThreadInfos } from 'lib/selectors/thread-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import { htmlTargetFromEvent } from '../vector-utils';
import css from './thread-picker.css';

type OptionProps = {
  +threadInfo: ThreadInfo,
  +createNewEntry: (threadID: string) => void,
};
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

type BaseProps = {
  +createNewEntry: (threadID: string) => void,
  +closePicker: () => void,
};
type Props = {
  ...BaseProps,
  +onScreenThreadInfos: $ReadOnlyArray<ThreadInfo>,
};

class ThreadPicker extends React.PureComponent<Props> {
  pickerDiv: ?HTMLDivElement;

  constructor(props: Props) {
    super(props);
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

    const options = this.props.onScreenThreadInfos.map(threadInfo => (
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
}

const ConnectedThreadPicker: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedThreadPicker(props) {
    const onScreenThreadInfos = useSelector(onScreenEntryEditableThreadInfos);
    return (
      <ThreadPicker {...props} onScreenThreadInfos={onScreenThreadInfos} />
    );
  },
);

export default ConnectedThreadPicker;
