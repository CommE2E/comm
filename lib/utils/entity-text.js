// @flow

import invariant from 'invariant';
import * as React from 'react';

import { threadNoun } from '../shared/thread-utils';
import { stringForUser } from '../shared/user-utils';
import {
  threadTypes,
  type ThreadType,
  type RawThreadInfo,
  type ThreadInfo,
} from '../types/thread-types';
import { basePluralize } from '../utils/text-utils';

type UserEntity = {
  +type: 'user',
  +id: string,
  +username?: ?string,
  +isViewer?: ?boolean,
  +possessive?: ?boolean, // eg. `user's` instead of `user`
};

// Comments explain how thread name will appear from user4's perspective
type ThreadEntity =
  | {
      +type: 'thread',
      +id: string,
      +name?: ?string,
      // displays threadInfo.name if set, or 'user1, user2, and user3'
      +display: 'uiName',
      +uiName: string,
    }
  | {
      +type: 'thread',
      +id: string,
      +name?: ?string,
      // displays threadInfo.name if set, or eg. 'this thread' or 'this chat'
      +display: 'shortName',
      +threadType?: ?ThreadType,
      +alwaysDisplayShortName?: ?boolean, // don't default to name
      +possessive?: ?boolean, // eg. `this thread's` instead of `this thread`
    };

type ColorEntity = {
  +type: 'color',
  +hex: string,
};

type EntityTextComponent = UserEntity | ThreadEntity | ColorEntity | string;

export type EntityText = $ReadOnlyArray<EntityTextComponent>;

const entityTextFunction = (
  strings: $ReadOnlyArray<string>,
  ...entities: $ReadOnlyArray<EntityTextComponent | EntityText>
) => {
  const result = [];
  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];
    if (str) {
      result.push(str);
    }
    const entity = entities[i];
    if (!entity) {
      continue;
    }

    if (typeof entity === 'string') {
      const lastResult = result.length > 0 && result[result.length - 1];
      if (typeof lastResult === 'string') {
        result[result.length - 1] = lastResult + entity;
      } else {
        result.push(entity);
      }
    } else if (Array.isArray(entity)) {
      const [firstEntity, ...restOfEntity] = entity;
      const lastResult = result.length > 0 && result[result.length - 1];
      if (typeof lastResult === 'string' && typeof firstEntity === 'string') {
        result[result.length - 1] = lastResult + firstEntity;
      } else if (firstEntity) {
        result.push(firstEntity);
      }
      result.push(...restOfEntity);
    } else {
      result.push(entity);
    }
  }
  return result;
};

// defaults to shortName
type EntityTextThreadInput =
  | {
      +display: 'uiName',
      +threadInfo: ThreadInfo,
    }
  | {
      +display?: 'shortName',
      +threadInfo: ThreadInfo | RawThreadInfo,
      +possessive?: ?boolean,
    }
  | {
      +display: 'alwaysDisplayShortName',
      +threadInfo: ThreadInfo | RawThreadInfo,
      +possessive?: ?boolean,
    }
  | {
      +display: 'alwaysDisplayShortName',
      +threadID: string,
      +possessive?: ?boolean,
    };
entityTextFunction.thread = (input: EntityTextThreadInput) => {
  if (input.display === 'uiName') {
    const { threadInfo } = input;
    return {
      type: 'thread',
      id: threadInfo.id,
      name: threadInfo.name,
      display: 'uiName',
      uiName: threadInfo.uiName,
    };
  }
  if (input.display === 'alwaysDisplayShortName' && input.threadID) {
    const { threadID, possessive } = input;
    return {
      type: 'thread',
      id: threadID,
      name: undefined,
      display: 'shortName',
      threadType: undefined,
      alwaysDisplayShortName: true,
      possessive,
    };
  } else if (input.display === 'alwaysDisplayShortName' && input.threadInfo) {
    const { threadInfo, possessive } = input;
    return {
      type: 'thread',
      id: threadInfo.id,
      name: threadInfo.name,
      display: 'shortName',
      threadType: threadInfo.type,
      alwaysDisplayShortName: true,
      possessive,
    };
  } else if (input.display === 'shortName' || !input.display) {
    const { threadInfo, possessive } = input;
    return {
      type: 'thread',
      id: threadInfo.id,
      name: threadInfo.name,
      display: 'shortName',
      threadType: threadInfo.type,
      possessive,
    };
  }
  invariant(
    false,
    `ET.thread passed unexpected display type: ${input.display}`,
  );
};

type EntityTextUserInput = {
  +userInfo: {
    +id: string,
    +username?: ?string,
    +isViewer?: ?boolean,
    ...
  },
  +possessive?: ?boolean,
};
entityTextFunction.user = (input: EntityTextUserInput) => ({
  type: 'user',
  id: input.userInfo.id,
  username: input.userInfo.username,
  isViewer: input.userInfo.isViewer,
  possessive: input.possessive,
});

type EntityTextColorInput = { +hex: string };
entityTextFunction.color = (input: EntityTextColorInput) => ({
  type: 'color',
  hex: input.hex,
});

// ET is a JS tag function used in template literals, eg. ET`something`
// It allows you to compose raw text and "entities" together
type EntityTextFunction = ((
  strings: $ReadOnlyArray<string>,
  ...entities: $ReadOnlyArray<EntityTextComponent | EntityText>
) => EntityText) & {
  +thread: EntityTextThreadInput => ThreadEntity,
  +user: EntityTextUserInput => UserEntity,
  +color: EntityTextColorInput => ColorEntity,
  ...
};
const ET: EntityTextFunction = entityTextFunction;

type MakePossessiveInput = { +str: string, +isViewer?: ?boolean };
function makePossessive(input: MakePossessiveInput) {
  if (input.isViewer) {
    return 'your';
  }
  return `${input.str}’s`;
}

function getNameForThreadEntity(entity: ThreadEntity): string {
  const { name: userGeneratedName, display } = entity;
  if (entity.display === 'uiName') {
    return userGeneratedName ? userGeneratedName : entity.uiName;
  }
  invariant(
    entity.display === 'shortName',
    `getNameForThreadEntity can't handle thread entity display ${display}`,
  );

  let name = userGeneratedName;
  if (!name || entity.alwaysDisplayShortName) {
    const threadType = entity.threadType ?? threadTypes.PERSONAL;
    name = `this ${threadNoun(threadType)}`;
  }
  if (entity.possessive) {
    name = makePossessive({ str: name });
  }
  return name;
}

function getNameForUserEntity(entity: UserEntity): string {
  const str = stringForUser(entity);
  const { isViewer, possessive } = entity;
  if (!possessive) {
    return str;
  }
  return makePossessive({ str, isViewer });
}

function entityTextToRawString(entityText: EntityText): string {
  const textParts = entityText.map(entity => {
    if (typeof entity === 'string') {
      return entity;
    } else if (entity.type === 'thread') {
      return getNameForThreadEntity(entity);
    } else if (entity.type === 'color') {
      return entity.hex;
    } else if (entity.type === 'user') {
      return getNameForUserEntity(entity);
    } else {
      invariant(
        false,
        `entityTextToRawString can't handle entity type ${entity.type}`,
      );
    }
  });
  return textParts.join('');
}

type RenderFunctions = {
  +renderText: ({ +text: string }) => React.Node,
  +renderThread: ({ +id: string, +name: string }) => React.Node,
  +renderColor: ({ +hex: string }) => React.Node,
};
function entityTextToReact(
  entityText: EntityText,
  threadID: string,
  renderFuncs: RenderFunctions,
): React.Node {
  const { renderText, renderThread, renderColor } = renderFuncs;
  return entityText.map((entity, i) => {
    const key = `text${i}`;
    if (typeof entity === 'string') {
      return (
        <React.Fragment key={key}>
          {renderText({ text: entity })}
        </React.Fragment>
      );
    } else if (entity.type === 'thread') {
      const { id } = entity;
      const name = getNameForThreadEntity(entity);
      if (id === threadID) {
        return name;
      } else {
        return (
          <React.Fragment key={key}>
            {renderThread({ id, name })}
          </React.Fragment>
        );
      }
    } else if (entity.type === 'color') {
      return (
        <React.Fragment key={key}>
          {renderColor({ hex: entity.hex })}
        </React.Fragment>
      );
    } else if (entity.type === 'user') {
      return getNameForUserEntity(entity);
    } else {
      invariant(
        false,
        `entityTextToReact can't handle entity type ${entity.type}`,
      );
    }
  });
}

function pluralizeEntityText(
  nouns: $ReadOnlyArray<EntityText>,
  maxNumberOfNouns: number = 3,
): EntityText {
  return basePluralize<EntityText>(
    nouns,
    maxNumberOfNouns,
    (a: EntityText | string, b: ?EntityText | string) =>
      b ? ET`${a}${b}` : ET`${a}`,
  );
}

export { ET, entityTextToRawString, entityTextToReact, pluralizeEntityText };
