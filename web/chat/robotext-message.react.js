// @flow

import PropTypes from 'prop-types';
import * as React from 'react';

import { type RobotextChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { splitRobotext, parseRobotextEntity } from 'lib/shared/message-utils';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import { connect } from 'lib/utils/redux-utils';

import Markdown from '../markdown/markdown.react';
import { linkRules } from '../markdown/rules.react';
import { type AppState, updateNavInfoActionType } from '../redux/redux-setup';
import css from './chat-message-list.css';
import { InlineSidebar } from './inline-sidebar.react';
import type {
  MessagePositionInfo,
  OnMessagePositionInfo,
} from './message-position-types';
import SidebarTooltip from './sidebar-tooltip.react';

type Props = {|
  +item: RobotextChatMessageInfoItem,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition: ?OnMessagePositionInfo,
|};
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

    const { id } = this.props.item.messageInfo;
    let sidebarTooltip;
    if (
      this.props.mouseOverMessagePosition &&
      this.props.mouseOverMessagePosition.item.messageInfo.id === id &&
      this.props.item.threadCreatedFromMessage
    ) {
      sidebarTooltip = (
        <SidebarTooltip
          threadCreatedFromMessage={this.props.item.threadCreatedFromMessage}
          onClick={this.onMouseLeave}
          messagePosition="center"
        />
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
          {sidebarTooltip}
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
    for (let splitPart of robotextParts) {
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

type InnerThreadEntityProps = {
  id: string,
  name: string,
  // Redux state
  threadInfo: ThreadInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class InnerThreadEntity extends React.PureComponent<InnerThreadEntityProps> {
  static propTypes = {
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  render() {
    return <a onClick={this.onClickThread}>{this.props.name}</a>;
  }

  onClickThread = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const id = this.props.id;
    this.props.dispatchActionPayload(updateNavInfoActionType, {
      activeChatThreadID: id,
    });
  };
}
const ThreadEntity = connect(
  (state: AppState, ownProps: { id: string }) => ({
    threadInfo: threadInfoSelector(state)[ownProps.id],
  }),
  null,
  true,
)(InnerThreadEntity);

function ColorEntity(props: {| color: string |}) {
  const colorStyle = { color: props.color };
  return <span style={colorStyle}>{props.color}</span>;
}

export default RobotextMessage;
