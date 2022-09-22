// @flow

import * as React from 'react';

import { draftKeyFromThreadID } from 'lib/shared/thread-utils';

import { commCoreModule } from '../native-modules';

export type UpdateDraft = (draft: {
  +key: string,
  +text: string,
}) => Promise<boolean>;

export type MoveDraft = (prevKey: string, nextKey: string) => Promise<boolean>;

export type CoreData = {
  +drafts: {
    +data: { +[key: string]: string },
    +updateDraft: UpdateDraft,
    +moveDraft: MoveDraft,
  },
};

const defaultCoreData = Object.freeze({
  drafts: {
    data: ({}: { +[key: string]: string }),
    updateDraft: commCoreModule.updateDraft,
    moveDraft: commCoreModule.moveDraft,
  },
});

const CoreDataContext: React.Context<CoreData> = React.createContext<CoreData>(
  defaultCoreData,
);

type ThreadDrafts = {
  +draft: string,
  +moveDraft: MoveDraft,
  +updateDraft: UpdateDraft,
};
const useDrafts = (threadID: ?string): ThreadDrafts => {
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
