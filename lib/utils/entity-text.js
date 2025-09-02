// @flow

import invariant from 'invariant';
import * as React from 'react';
import t, { type TInterface, type TUnion } from 'tcomb';

import type { GetENSNames } from './ens-helpers.js';
import type { GetFCNames } from './farcaster-helpers.js';
import { tID, tShape, tString, tUserID } from './validation-utils.js';
import { useResolvableNames } from '../hooks/ens-cache.js';
import { useFCNames } from '../hooks/fc-cache.js';
import { threadNoun } from '../shared/thread-utils.js';
import { stringForUser } from '../shared/user-utils.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  type ThreadType,
  threadTypes,
  threadTypeValidator,
} from '../types/thread-types-enum.js';
import { basePluralize } from '../utils/text-utils.js';

export type UserEntity = {
  +type: 'user',
  +id: string,
  +username?: ?string,
  +isViewer?: ?boolean,
  +possessive?: ?boolean, // eg. `user's` instead of `user`
};
export const userEntityValidator: TInterface<UserEntity> = tShape<UserEntity>({
  type: tString('user'),
  id: tUserID,
  username: t.maybe(t.String),
  isViewer: t.maybe(t.Boolean),
  possessive: t.maybe(t.Boolean),
});

// Comments explain how thread name will appear from user4's perspective
export type ThreadEntity =
  | {
      +type: 'thread',
      +id: string,
      +name?: ?string,
      // displays threadInfo.name if set, or 'user1, user2, and user3'
      +display: 'uiName',
      // If uiName is EntityText, then at render time ThreadEntity will be
      // replaced with a pluralized list of uiName's UserEntities
      +uiName: $ReadOnlyArray<UserEntity> | string,
      // If name isn't set and uiName is an array with only the viewer, then
      // just_you_string displays "just you" but viewer_username displays the
      // viewer's ENS-resolved username. Defaults to just_you_string
      +ifJustViewer?: 'just_you_string' | 'viewer_username',
    }
  | {
      +type: 'thread',
      +id: string,
      +name?: ?string,
      // displays threadInfo.name if set, or eg. 'this thread' or 'this chat'
      +display: 'shortName',
      +threadType?: ?ThreadType,
      +parentThreadID?: ?string,
      +alwaysDisplayShortName?: ?boolean, // don't default to name
      +subchannel?: ?boolean, // short name should be "subchannel"
      +possessive?: ?boolean, // eg. `this thread's` instead of `this thread`
    };

export const threadEntityValidator: TUnion<ThreadEntity> = t.union([
  tShape({
    type: tString('thread'),
    id: tID,
    name: t.maybe(t.String),
    display: tString('uiName'),
    uiName: t.union([t.list(userEntityValidator), t.String]),
    ifJustViewer: t.maybe(t.enums.of(['just_you_string', 'viewer_username'])),
  }),
  tShape({
    type: tString('thread'),
    id: tID,
    name: t.maybe(t.String),
    display: tString('shortName'),
    threadType: t.maybe(threadTypeValidator),
    parentThreadID: t.maybe(tID),
    alwaysDisplayShortName: t.maybe(t.Boolean),
    subchannel: t.maybe(t.Boolean),
    possessive: t.maybe(t.Boolean),
  }),
]);

type ColorEntity = {
  +type: 'color',
  +hex: string,
};

type FarcasterUserEntity = {
  +type: 'farcaster_user',
  +fid: string,
  +farcasterUsername?: ?string,
};

type EntityTextComponent =
  | UserEntity
  | ThreadEntity
  | ColorEntity
  | FarcasterUserEntity
  | string;

export type EntityText = $ReadOnlyArray<EntityTextComponent>;

const entityTextFunction = (
  strings: $ReadOnlyArray<string>,
  ...entities: $ReadOnlyArray<EntityTextComponent | EntityText>
) => {
  const result: EntityTextComponent[] = [];
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
      +threadInfo: RawThreadInfo | ThreadInfo,
      +subchannel?: ?boolean,
      +possessive?: ?boolean,
    }
  | {
      +display: 'alwaysDisplayShortName',
      +threadInfo: RawThreadInfo | ThreadInfo,
      +possessive?: ?boolean,
    }
  | {
      +display: 'alwaysDisplayShortName',
      +threadID: string,
      +parentThreadID?: ?string,
      +threadType?: ?ThreadType,
      +possessive?: ?boolean,
    };
// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
entityTextFunction.thread = (input: EntityTextThreadInput) => {
  if (input.display === 'uiName') {
    const { threadInfo } = input;
    if (typeof threadInfo.uiName !== 'string') {
      return threadInfo.uiName;
    }
    return {
      type: 'thread',
      id: threadInfo.id,
      name: threadInfo.name,
      display: 'uiName',
      uiName: threadInfo.uiName,
    };
  }
  if (input.display === 'alwaysDisplayShortName' && input.threadID) {
    const { threadID, threadType, parentThreadID, possessive } = input;
    return {
      type: 'thread',
      id: threadID,
      name: undefined,
      display: 'shortName',
      threadType,
      parentThreadID,
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
      parentThreadID: threadInfo.parentThreadID,
      alwaysDisplayShortName: true,
      possessive,
    };
  } else if (input.display === 'shortName' || !input.display) {
    const { threadInfo, subchannel, possessive } = input;
    return {
      type: 'thread',
      id: threadInfo.id,
      name: threadInfo.name,
      display: 'shortName',
      threadType: threadInfo.type,
      parentThreadID: threadInfo.parentThreadID,
      subchannel,
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

type EntityTextFarcasterUserInput = { +fid: string };
entityTextFunction.fcUser = (input: EntityTextFarcasterUserInput) => ({
  type: 'farcaster_user',
  fid: input.fid,
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
  +fcUser: EntityTextFarcasterUserInput => FarcasterUserEntity,
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

function getNameForThreadEntity(
  entity: ThreadEntity,
  params?: ?EntityTextToRawStringParams,
): string {
  const { name: userGeneratedName, display } = entity;
  if (entity.display === 'uiName') {
    if (userGeneratedName) {
      return userGeneratedName;
    }
    const { uiName } = entity;
    if (typeof uiName === 'string') {
      return uiName;
    }

    let userEntities = uiName;
    if (!params?.ignoreViewer) {
      const viewerFilteredUserEntities = userEntities.filter(
        innerEntity => !innerEntity.isViewer,
      );
      if (viewerFilteredUserEntities.length > 0) {
        userEntities = viewerFilteredUserEntities;
      } else if (entity.ifJustViewer === 'viewer_username') {
        // We pass ignoreViewer to entityTextToRawString in order
        // to prevent it from rendering the viewer as "you"
        params = { ...params, ignoreViewer: true };
      } else {
        return 'just you';
      }
    }

    const pluralized = pluralizeEntityText(
      userEntities.map(innerEntity => [innerEntity]),
    );
    return entityTextToRawString(pluralized, params);
  }

  invariant(
    entity.display === 'shortName',
    `getNameForThreadEntity can't handle thread entity display ${display}`,
  );

  let { name } = entity;
  if (!name || entity.alwaysDisplayShortName) {
    const threadType = entity.threadType ?? threadTypes.PERSONAL;
    const { parentThreadID } = entity;
    const noun = entity.subchannel
      ? 'subchannel'
      : threadNoun(threadType, parentThreadID);
    if (entity.id === params?.threadID) {
      const prefixThisThreadNounWith =
        params?.prefixThisThreadNounWith === 'your' ? 'your' : 'this';
      name = `${prefixThisThreadNounWith} ${noun}`;
    } else {
      name = `a ${noun}`;
    }
  }
  if (entity.possessive) {
    name = makePossessive({ str: name });
  }
  return name;
}

function getNameForUserEntity(
  entity: UserEntity,
  ignoreViewer: ?boolean,
): string {
  const isViewer = entity.isViewer && !ignoreViewer;
  const entityWithIsViewerIgnored = { ...entity, isViewer };
  const str = stringForUser(entityWithIsViewerIgnored);
  if (!entityWithIsViewerIgnored.possessive) {
    return str;
  }
  return makePossessive({ str, isViewer });
}

function getNameForFarcasterUserEntity(entity: FarcasterUserEntity): string {
  return entity.farcasterUsername ?? '<failed to fetch Farcaster username>';
}

type EntityTextToRawStringParams = {
  +threadID?: ?string,
  +ignoreViewer?: ?boolean,
  +prefixThisThreadNounWith?: ?('this' | 'your'),
};
function entityTextToRawString(
  entityText: EntityText,
  params?: ?EntityTextToRawStringParams,
): string {
  // ESLint doesn't recognize that invariant always throws
  // eslint-disable-next-line consistent-return
  const textParts = entityText.map(entity => {
    if (typeof entity === 'string') {
      return entity;
    } else if (entity.type === 'thread') {
      return getNameForThreadEntity(entity, params);
    } else if (entity.type === 'color') {
      return entity.hex;
    } else if (entity.type === 'user') {
      return getNameForUserEntity(entity, params?.ignoreViewer);
    } else if (entity.type === 'farcaster_user') {
      return getNameForFarcasterUserEntity(entity);
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
  +renderUser: ({ +userID: string, +usernameText: string }) => React.Node,
  +renderColor: ({ +hex: string }) => React.Node,
  +renderFarcasterUser: ({ +farcasterUsername: string }) => React.Node,
};
function entityTextToReact(
  entityText: EntityText,
  threadID: string,
  renderFuncs: RenderFunctions,
): React.Node {
  const {
    renderText,
    renderThread,
    renderUser,
    renderColor,
    renderFarcasterUser,
  } = renderFuncs;
  // ESLint doesn't recognize that invariant always throws
  // eslint-disable-next-line consistent-return
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
      const name = getNameForThreadEntity(entity, { threadID });
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
      const userID = entity.id;
      const usernameText = getNameForUserEntity(entity);

      return (
        <React.Fragment key={key}>
          {renderUser({ userID, usernameText })}
        </React.Fragment>
      );
    } else if (entity.type === 'farcaster_user') {
      const name = getNameForFarcasterUserEntity(entity);
      return (
        <React.Fragment key={key}>
          {renderFarcasterUser({ farcasterUsername: name })}
        </React.Fragment>
      );
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

type TextEntity = { +type: 'text', +text: string };
type ShadowUserEntity = {
  +type: 'shadowUser',
  +username: string,
  +originalUsername: string,
};
type EntityTextComponentAsObject =
  | UserEntity
  | ThreadEntity
  | ColorEntity
  | TextEntity
  | FarcasterUserEntity
  | ShadowUserEntity;
function entityTextToObjects(
  entityText: EntityText,
): EntityTextComponentAsObject[] {
  const objs: EntityTextComponentAsObject[] = [];
  for (const entity of entityText) {
    if (typeof entity === 'string') {
      objs.push({ type: 'text', text: entity });
      continue;
    }
    objs.push(entity);
    if (
      entity.type === 'thread' &&
      entity.display === 'uiName' &&
      typeof entity.uiName !== 'string'
    ) {
      for (const innerEntity of entity.uiName) {
        if (typeof innerEntity === 'string' || innerEntity.type !== 'user') {
          continue;
        }
        const { username } = innerEntity;
        if (username) {
          objs.push({
            type: 'shadowUser',
            originalUsername: username,
            username,
          });
        }
      }
    }
  }
  return objs;
}
function entityTextFromObjects(
  objects: $ReadOnlyArray<EntityTextComponentAsObject>,
): EntityText {
  const shadowUserMap = new Map<string, string>();
  for (const obj of objects) {
    if (obj.type === 'shadowUser' && obj.username !== obj.originalUsername) {
      shadowUserMap.set(obj.originalUsername, obj.username);
    }
  }
  return objects
    .map(entity => {
      if (entity.type === 'text') {
        return entity.text;
      } else if (entity.type === 'shadowUser') {
        return null;
      } else if (
        entity.type === 'thread' &&
        entity.display === 'uiName' &&
        typeof entity.uiName !== 'string'
      ) {
        const uiName: UserEntity[] = [];
        let changeOccurred = false;
        for (const innerEntity of entity.uiName) {
          if (typeof innerEntity === 'string' || innerEntity.type !== 'user') {
            uiName.push(innerEntity);
            continue;
          }
          const { username } = innerEntity;
          if (!username) {
            uiName.push(innerEntity);
            continue;
          }
          const ensName = shadowUserMap.get(username);
          if (!ensName) {
            uiName.push(innerEntity);
            continue;
          }
          changeOccurred = true;
          uiName.push({
            ...innerEntity,
            username: ensName,
          });
        }
        if (!changeOccurred) {
          return entity;
        }
        return {
          ...entity,
          uiName,
        };
      } else {
        return entity;
      }
    })
    .filter(Boolean);
}

export type UseResolvedEntityTextOptions = {
  +allAtOnce?: ?boolean,
};

function useResolvedEntityText(
  entityText: ?EntityText,
  options?: ?UseResolvedEntityTextOptions,
): ?EntityText {
  const allObjects = React.useMemo(
    () => (entityText ? entityTextToObjects(entityText) : []),
    [entityText],
  );
  const objectsWithENSNames = useResolvableNames(allObjects, options);
  const objectsWithFCNames = useFCNames(allObjects, options);
  return React.useMemo(() => {
    if (!entityText) {
      return entityText;
    }
    const mergedObjects = [];
    for (let i = 0; i < allObjects.length; i++) {
      const originalObject = allObjects[i];
      const updatedObject = originalObject.fid
        ? objectsWithFCNames[i]
        : objectsWithENSNames[i];
      mergedObjects.push(updatedObject);
    }
    return entityTextFromObjects(mergedObjects);
  }, [entityText, allObjects, objectsWithENSNames, objectsWithFCNames]);
}

function useEntityTextAsString(
  entityText: ?EntityText,
  params?: EntityTextToRawStringParams,
): ?string {
  const withENSNames = useResolvedEntityText(entityText);
  return React.useMemo(() => {
    if (!withENSNames) {
      return withENSNames;
    }
    return entityTextToRawString(withENSNames, params);
  }, [withENSNames, params]);
}

type Fetchers = {
  +getENSNames?: ?GetENSNames,
  +getFCNames?: ?GetFCNames,
};
async function getEntityTextAsString(
  entityText: ?EntityText,
  fetchers?: Fetchers,
  params?: EntityTextToRawStringParams,
): Promise<?string> {
  if (!entityText) {
    return entityText;
  }

  const getENSNames = fetchers?.getENSNames;
  const getFCNames = fetchers?.getFCNames;

  if (!getENSNames && !getFCNames) {
    return entityTextToRawString(entityText, params);
  }

  const allObjects = entityTextToObjects(entityText);

  const objectsWithENSNamesPromise = (async () => {
    if (!getENSNames) {
      return allObjects;
    }
    return await getENSNames(allObjects);
  })();
  const objectsWithFCNamesPromise = (async () => {
    if (!getFCNames) {
      return allObjects;
    }
    return await getFCNames(allObjects);
  })();
  const [objectsWithENSNames, objectsWithFCNames] = await Promise.all([
    objectsWithENSNamesPromise,
    objectsWithFCNamesPromise,
  ]);

  const mergedObjects = [];
  for (let i = 0; i < allObjects.length; i++) {
    const originalObject = allObjects[i];
    const updatedObject = originalObject.fid
      ? objectsWithFCNames[i]
      : objectsWithENSNames[i];
    mergedObjects.push(updatedObject);
  }

  const resolvedEntityText = entityTextFromObjects(mergedObjects);
  return entityTextToRawString(resolvedEntityText, params);
}

export {
  ET,
  entityTextToRawString,
  entityTextToReact,
  getNameForThreadEntity,
  pluralizeEntityText,
  useResolvedEntityText,
  useEntityTextAsString,
  getEntityTextAsString,
};
