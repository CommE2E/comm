// @flow

import classNames from 'classnames';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { type RobotextChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { splitRobotext, parseRobotextEntity } from 'lib/shared/message-utils';
import { useSidebarExistsOrCanBeCreated } from 'lib/shared/thread-utils';
import type { Dispatch } from 'lib/types/redux-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import Markdown from '../markdown/markdown.react';
import { linkRules } from '../markdown/rules.react';
import { useSelector } from '../redux/redux-utils';
import { updateNavInfoActionType } from '../types/nav-types';
import { InlineSidebar } from './inline-sidebar.react';
import MessageTooltip from './message-tooltip.react';
import type {
  MessagePositionInfo,
  OnMessagePositionWithContainerInfo,
} from './position-types';
import css from './robotext-message.css';
import { tooltipPositions } from './tooltip-utils';

const availableTooltipPositionsForRobotext = [
  tooltipPositions.TOP_RIGHT,
  tooltipPositions.RIGHT,
  tooltipPositions.LEFT,
];
const cannotReply = { canReply: false };

type BaseProps = {
  +item: RobotextChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition: ?OnMessagePositionWithContainerInfo,
};
type Props = {
  ...BaseProps,
  // Redux state
  +sidebarExistsOrCanBeCreated: boolean,
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

    const { item, threadInfo, sidebarExistsOrCanBeCreated } = this.props;
    const { id } = item.messageInfo;
    let messageTooltip;
    if (
      this.props.mouseOverMessagePosition &&
      this.props.mouseOverMessagePosition.item.messageInfo.id === id &&
      sidebarExistsOrCanBeCreated
    ) {
      messageTooltip = (
        <MessageTooltip
          threadInfo={threadInfo}
          item={item}
          mouseOverMessagePosition={this.props.mouseOverMessagePosition}
          availableTooltipPositions={availableTooltipPositionsForRobotext}
          messageReplyProps={cannotReply}
        />
      );
    }

    let messageTooltipLinks;
    if (messageTooltip) {
      messageTooltipLinks = (
        <div
          className={classNames(
            css.messageTooltipLinks,
            css.nonViewerMessageTooltipLinks,
          )}
        >
          {messageTooltip}
        </div>
      );
    }

    return (
      <div className={css.robotextContainer}>
        <div
          className={css.innerRobotextContainer}
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
        >
          <span>{this.linkedRobotext()}</span>
          {messageTooltipLinks}
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

  onMouseEnter = (event: SyntheticEvent<HTMLDivElement>) => {
    const { item } = this.props;
    const rect = event.currentTarget.getBoundingClientRect();
    const { top, bottom, left, right, height, width } = rect;
    const messagePosition = { top, bottom, left, right, height, width };
    this.props.setMouseOverMessagePosition({
      type: 'on',
      item,
      messagePosition,
    });
  };

  onMouseLeave = () => {
    const { item } = this.props;
    this.props.setMouseOverMessagePosition({ type: 'off', item });
  };
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
    const sidebarExistsOrCanBeCreated = useSidebarExistsOrCanBeCreated(
      props.threadInfo,
      props.item,
    );
    return (
      <RobotextMessage
        {...props}
        sidebarExistsOrCanBeCreated={sidebarExistsOrCanBeCreated}
      />
    );
  },
);

export default ConnectedRobotextMessage;
