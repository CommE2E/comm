// @flow

import invariant from 'invariant';
import * as React from 'react';

import { newThreadActionTypes, newThread } from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  generateRandomColor,
  threadTypeDescriptions,
} from 'lib/shared/thread-utils';
import type { CalendarQuery } from 'lib/types/entry-types';
import {
  type ThreadInfo,
  threadTypes,
  assertThreadType,
  type ThreadType,
  type ClientNewThreadRequest,
  type NewThreadResult,
} from 'lib/types/thread-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import { firstLine } from 'lib/utils/string-utils';

import { useSelector } from '../../redux/redux-utils';
import { nonThreadCalendarQuery } from '../../selectors/nav-selectors';
import css from '../../style.css';
import Modal from '../modal.react';
import ColorPicker from './color-picker.react';

type BaseProps = {|
  +onClose: () => void,
  +parentThreadID?: ?string,
|};
type Props = {|
  ...BaseProps,
  +inputDisabled: boolean,
  +calendarQuery: () => CalendarQuery,
  +parentThreadInfo: ?ThreadInfo,
  +dispatchActionPromise: DispatchActionPromise,
  +newThread: (request: ClientNewThreadRequest) => Promise<NewThreadResult>,
|};
type State = {|
  +threadType: ?ThreadType,
  +name: string,
  +description: string,
  +color: string,
  +errorMessage: string,
|};

class NewThreadModal extends React.PureComponent<Props, State> {
  nameInput: ?HTMLInputElement;
  openPrivacyInput: ?HTMLInputElement;
  threadPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      threadType: props.parentThreadID ? undefined : threadTypes.CHAT_SECRET,
      name: '',
      description: '',
      color: props.parentThreadInfo
        ? props.parentThreadInfo.color
        : generateRandomColor(),
      errorMessage: '',
    };
  }

  componentDidMount() {
    invariant(this.nameInput, 'nameInput ref unset');
    this.nameInput.focus();
  }

  render() {
    let threadTypeSection = null;
    if (this.props.parentThreadID) {
      threadTypeSection = (
        <div className={css['new-thread-privacy-container']}>
          <div className={css['modal-radio-selector']}>
            <div className={css['form-title']}>Thread type</div>
            <div className={css['form-enum-selector']}>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="new-thread-type"
                  id="new-thread-open"
                  value={threadTypes.CHAT_NESTED_OPEN}
                  checked={
                    this.state.threadType === threadTypes.CHAT_NESTED_OPEN
                  }
                  onChange={this.onChangeThreadType}
                  disabled={this.props.inputDisabled}
                  ref={this.openPrivacyInputRef}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="new-thread-open">
                    Open
                    <span className={css['form-enum-description']}>
                      {threadTypeDescriptions[threadTypes.CHAT_NESTED_OPEN]}
                    </span>
                  </label>
                </div>
              </div>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="new-thread-type"
                  id="new-thread-closed"
                  value={threadTypes.CHAT_SECRET}
                  checked={this.state.threadType === threadTypes.CHAT_SECRET}
                  onChange={this.onChangeThreadType}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="new-thread-closed">
                    Secret
                    <span className={css['form-enum-description']}>
                      {threadTypeDescriptions[threadTypes.CHAT_SECRET]}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <Modal name="New thread" onClose={this.props.onClose} size="large">
        <div className={css['modal-body']}>
          <form method="POST">
            <div>
              <div className={css['form-title']}>Thread name</div>
              <div className={css['form-content']}>
                <input
                  type="text"
                  value={firstLine(this.state.name)}
                  placeholder="Thread name"
                  onChange={this.onChangeName}
                  disabled={this.props.inputDisabled}
                  ref={this.nameInputRef}
                />
              </div>
            </div>
            <div className={css['form-textarea-container']}>
              <div className={css['form-title']}>Description</div>
              <div className={css['form-content']}>
                <textarea
                  value={this.state.description}
                  placeholder="Thread description"
                  onChange={this.onChangeDescription}
                  disabled={this.props.inputDisabled}
                />
              </div>
            </div>
            {threadTypeSection}
            <div>
              <div className={`${css['form-title']} ${css['color-title']}`}>
                Color
              </div>
              <div className={css['form-content']}>
                <ColorPicker
                  id="new-thread-color"
                  value={this.state.color}
                  disabled={this.props.inputDisabled}
                  onChange={this.onChangeColor}
                />
              </div>
            </div>
            <div className={css['form-footer']}>
              <input
                type="submit"
                value="Save"
                onClick={this.onSubmit}
                disabled={this.props.inputDisabled}
              />
              <div className={css['modal-form-error']}>
                {this.state.errorMessage}
              </div>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  nameInputRef = (nameInput: ?HTMLInputElement) => {
    this.nameInput = nameInput;
  };

  openPrivacyInputRef = (openPrivacyInput: ?HTMLInputElement) => {
    this.openPrivacyInput = openPrivacyInput;
  };

  onChangeName = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ name: firstLine(target.value) });
  };

  onChangeDescription = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, 'target not textarea');
    this.setState({ description: target.value });
  };

  onChangeColor = (color: string) => {
    this.setState({ color: color });
  };

  onChangeThreadType = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({
      threadType: assertThreadType(parseInt(target.value, 10)),
    });
  };

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

    const threadType = this.state.threadType;
    invariant(
      threadType !== null,
      'threadType state should never be set to null',
    );
    if (threadType === undefined) {
      this.setState(
        {
          errorMessage: 'thread type unspecified',
        },
        () => {
          invariant(this.openPrivacyInput, 'openPrivacyInput ref unset');
          this.openPrivacyInput.focus();
        },
      );
      return;
    }

    this.props.dispatchActionPromise(
      newThreadActionTypes,
      this.newThreadAction(threadType),
    );
  };

  async newThreadAction(threadType: ThreadType) {
    const name = this.state.name.trim();
    try {
      invariant(
        threadType !== 5,
        'Creating sidebars from modal is not yet supported',
      );
      const query = this.props.calendarQuery();
      const response = await this.props.newThread({
        type: threadType,
        name,
        description: this.state.description,
        color: this.state.color,
        calendarQuery: query,
      });
      this.props.onClose();
      return response;
    } catch (e) {
      this.setState(
        {
          threadType: undefined,
          name: '',
          description: '',
          color: '',
          errorMessage: 'unknown error',
        },
        () => {
          invariant(this.nameInput, 'nameInput ref unset');
          this.nameInput.focus();
        },
      );
      throw e;
    }
  }
}

const loadingStatusSelector = createLoadingStatusSelector(newThreadActionTypes);

export default React.memo<BaseProps>(function ConnectedNewThreadModal(
  props: BaseProps,
) {
  const { parentThreadID } = props;
  const parentThreadInfo: ?ThreadInfo = useSelector((state) =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  invariant(!parentThreadID || parentThreadInfo, 'parent thread should exist');
  const inputDisabled = useSelector(loadingStatusSelector) === 'loading';
  const calendarQuery = useSelector(nonThreadCalendarQuery);
  const callNewThread = useServerCall(newThread);
  const dispatchActionPromise = useDispatchActionPromise();

  return (
    <NewThreadModal
      {...props}
      parentThreadInfo={parentThreadInfo}
      inputDisabled={inputDisabled}
      calendarQuery={calendarQuery}
      newThread={callNewThread}
      dispatchActionPromise={dispatchActionPromise}
    />
  );
});
