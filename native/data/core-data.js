// @flow

import './core-module-shim';
import * as React from 'react';

import { draftKeyFromThreadID } from 'lib/shared/thread-utils';

export type UpdateDraft = (draft: {|
  +key: string,
  +text: string,
|}) => Promise<boolean>;

export type MoveDraft = (prevKey: string, nextKey: string) => Promise<boolean>;

export type CoreData = {|
  +drafts: {|
    +data: { +[key: string]: string },
    +updateDraft: UpdateDraft,
    +moveDraft: MoveDraft,
  |},
|};

const defaultCoreData = Object.freeze({
  drafts: {
    data: {},
    updateDraft: global.CommCoreModule.updateDraft,
    moveDraft: global.CommCoreModule.moveDraft,
  },
});

const CoreDataContext = React.createContext<CoreData>(defaultCoreData);

const useDrafts = (threadID: ?string) => {
  const coreData = React.useContext(CoreDataContext);
  return React.useMemo(
    () => ({
      draft: threadID
        ? coreData.drafts.data[draftKeyFromThreadID(threadID)] ?? ''
        : '',
      updateDraft: coreData.drafts.updateDraft,
      moveDraft: coreData.drafts.moveDraft,
    }),
    [coreData, threadID],
  );
};

export { defaultCoreData, CoreDataContext, useDrafts };
