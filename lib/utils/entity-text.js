// @flow

import invariant from 'invariant';
import * as React from 'react';

import { threadNoun } from '../shared/thread-utils';
import { stringForUser } from '../shared/user-utils';
import { threadTypes, type ThreadType } from '../types/thread-types';

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

// ET is a JS tag function used in template literals, eg. ET`something`
// It allows you to compose raw text and "entities" together
function ET(
  strings: $ReadOnlyArray<string>,
  ...entities: $ReadOnlyArray<EntityTextComponent | EntityText>
): EntityText {
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
}

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

export { ET, entityTextToRawString, entityTextToReact };
