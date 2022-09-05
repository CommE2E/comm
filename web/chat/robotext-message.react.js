// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { type RobotextChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { splitRobotext, parseRobotextEntity } from 'lib/shared/message-utils';
import type { Dispatch } from 'lib/types/redux-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import Markdown from '../markdown/markdown.react';
import { linkRules } from '../markdown/rules.react';
import { updateNavInfoActionType } from '../redux/action-types';
import { useSelector } from '../redux/redux-utils';
import InlineSidebar from './inline-sidebar.react';
import css from './robotext-message.css';
import { tooltipPositions, useMessageTooltip } from './tooltip-utils';

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
    let inlineSidebar;
    if (this.props.item.threadCreatedFromMessage) {
      inlineSidebar = (
        <div className={css.sidebarMarginTop}>
          <InlineSidebar
            threadInfo={this.props.item.threadCreatedFromMessage}
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
        {inlineSidebar}
      </div>
    );
  }

  linkedRobotext() {
    const { item } = this.props;
    const { robotext } = item;
    const robotextParts = splitRobotext(robotext);
    const textParts = [];
    let keyIndex = 0;
    for (const splitPart of robotextParts) {
      if (splitPart === '') {
        continue;
      }
      if (splitPart.charAt(0) !== '<') {
        const key = `text${keyIndex++}`;
        textParts.push(
          <Markdown key={key} rules={linkRules(false)}>
            {decodeURI(splitPart)}
          </Markdown>,
        );
        continue;
      }

      const { rawText, entityType, id } = parseRobotextEntity(splitPart);

      if (entityType === 't' && id !== item.messageInfo.threadID) {
        textParts.push(<ThreadEntity key={id} id={id} name={rawText} />);
      } else if (entityType === 'c') {
        textParts.push(<ColorEntity key={id} color={rawText} />);
      } else {
        textParts.push(rawText);
      }
    }

    return textParts;
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
