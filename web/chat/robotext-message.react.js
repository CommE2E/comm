// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { type RobotextChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import type { Dispatch } from 'lib/types/redux-types';
import { type ThreadInfo } from 'lib/types/thread-types';
import {
  entityTextToReact,
  useENSNamesForEntityText,
} from 'lib/utils/entity-text';

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

type Props = {
  +item: RobotextChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};
function RobotextMessage(props: Props): React.Node {
  let inlineEngagement;
  const { item } = props;
  const { threadCreatedFromMessage, reactions } = item;
  if (threadCreatedFromMessage || Object.keys(reactions).length > 0) {
    inlineEngagement = (
      <div className={css.sidebarMarginTop}>
        <InlineEngagement
          threadInfo={threadCreatedFromMessage}
          reactions={reactions}
          positioning="center"
        />
      </div>
    );
  }

  const { messageInfo, robotext } = item;
  const { threadID } = messageInfo;
  const robotextWithENSNames = useENSNamesForEntityText(robotext);
  const textParts = React.useMemo(() => {
    return entityTextToReact(robotextWithENSNames, threadID, {
      // eslint-disable-next-line react/display-name
      renderText: ({ text }) => (
        <Markdown rules={linkRules(false)}>{text}</Markdown>
      ),
      // eslint-disable-next-line react/display-name
      renderThread: ({ id, name }) => <ThreadEntity id={id} name={name} />,
      // eslint-disable-next-line react/display-name
      renderColor: ({ hex }) => <ColorEntity color={hex} />,
    });
  }, [robotextWithENSNames, threadID]);

  const { threadInfo } = props;
  const { onMouseEnter, onMouseLeave } = useMessageTooltip({
    item,
    threadInfo,
    availablePositions: availableTooltipPositionsForRobotext,
  });

  return (
    <div className={css.robotextContainer}>
      <div
        className={css.innerRobotextContainer}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span>{textParts}</span>
      </div>
      {inlineEngagement}
    </div>
  );
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

const MemoizedRobotextMessage: React.ComponentType<Props> = React.memo<Props>(
  RobotextMessage,
);

export default MemoizedRobotextMessage;
