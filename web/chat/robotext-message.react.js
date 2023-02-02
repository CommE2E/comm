// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { type RobotextChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import type { Dispatch } from 'lib/types/redux-types';
import { type ThreadInfo } from 'lib/types/thread-types';
import { entityTextToReact } from 'lib/utils/entity-text';

import Markdown from '../markdown/markdown.react';
import { linkRules } from '../markdown/rules.react';
import { updateNavInfoActionType } from '../redux/action-types';
import { useSelector } from '../redux/redux-utils';
import { tooltipPositions, useMessageTooltip } from '../utils/tooltip-utils';
import InlineEngagement from './inline-engagement.react';
import css from './robotext-message.css';

const availableTooltipPositionsForRobotext = [
  tooltipPositions.LEFT,
  tooltipPositions.LEFT_TOP,
  tooltipPositions.LEFT_BOTTOM,
  tooltipPositions.RIGHT,
  tooltipPositions.RIGHT_TOP,
  tooltipPositions.RIGHT_BOTTOM,
];

type BaseProps = {
  +item: RobotextChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};
type Props = {
  ...BaseProps,
  +onMouseLeave: ?() => mixed,
  +onMouseEnter: (event: SyntheticEvent<HTMLDivElement>) => mixed,
};
class RobotextMessage extends React.PureComponent<Props> {
  render() {
    let inlineEngagement;
    if (
      this.props.item.threadCreatedFromMessage ||
      this.props.item.reactions.size > 0
    ) {
      inlineEngagement = (
        <div className={css.sidebarMarginTop}>
          <InlineEngagement
            threadInfo={this.props.item.threadCreatedFromMessage}
            reactions={this.props.item.reactions}
            positioning="center"
          />
        </div>
      );
    }

    return (
      <div className={css.robotextContainer}>
        <div
          className={css.innerRobotextContainer}
          onMouseEnter={this.props.onMouseEnter}
          onMouseLeave={this.props.onMouseLeave}
        >
          <span>{this.linkedRobotext()}</span>
        </div>
        {inlineEngagement}
      </div>
    );
  }

  linkedRobotext() {
    const { item } = this.props;
    const { robotext } = item;
    const { threadID } = item.messageInfo;
    return entityTextToReact(robotext, threadID, {
      renderText: ({ text }) => (
        <Markdown rules={linkRules(false)}>{text}</Markdown>
      ),
      renderThread: ({ id, name }) => <ThreadEntity id={id} name={name} />,
      renderColor: ({ hex }) => <ColorEntity color={hex} />,
    });
  }
}
type BaseInnerThreadEntityProps = {
  +id: string,
  +name: string,
};
type InnerThreadEntityProps = {
  ...BaseInnerThreadEntityProps,
  +threadInfo: ThreadInfo,
  +dispatch: Dispatch,
};
class InnerThreadEntity extends React.PureComponent<InnerThreadEntityProps> {
  render() {
    return <a onClick={this.onClickThread}>{this.props.name}</a>;
  }

  onClickThread = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const id = this.props.id;
    this.props.dispatch({
      type: updateNavInfoActionType,
      payload: {
        activeChatThreadID: id,
      },
    });
  };
}
const ThreadEntity = React.memo<BaseInnerThreadEntityProps>(
  function ConnectedInnerThreadEntity(props: BaseInnerThreadEntityProps) {
    const { id } = props;
    const threadInfo = useSelector(state => threadInfoSelector(state)[id]);
    const dispatch = useDispatch();

    return (
      <InnerThreadEntity
        {...props}
        threadInfo={threadInfo}
        dispatch={dispatch}
      />
    );
  },
);

function ColorEntity(props: { color: string }) {
  const colorStyle = { color: props.color };
  return <span style={colorStyle}>{props.color}</span>;
}

const ConnectedRobotextMessage: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedRobotextMessage(props) {
    const { item, threadInfo } = props;

    const { onMouseLeave, onMouseEnter } = useMessageTooltip({
      item,
      threadInfo,
      availablePositions: availableTooltipPositionsForRobotext,
    });

    return (
      <RobotextMessage
        {...props}
        onMouseLeave={onMouseLeave}
        onMouseEnter={onMouseEnter}
      />
    );
  },
);

export default ConnectedRobotextMessage;
