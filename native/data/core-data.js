// @flow

import * as React from 'react';

import { draftKeyFromThreadID } from 'lib/shared/thread-utils';

import { commCoreModule } from '../native-modules';
import { checkIfTaskWasCancelled } from '../utils/error-handling';

type DraftType = {
  +key: string,
  +text: string,
};

export type UpdateDraft = (draft: DraftType) => Promise<boolean>;
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
    updateDraft: async (draft: DraftType): Promise<boolean> => {
      try {
        return commCoreModule.updateDraft(draft);
      } catch (e) {
        if (!checkIfTaskWasCancelled(e)) {
          throw e;
        }
      }
      return false;
    },
    moveDraft: async (prevKey: string, nextKey: string): Promise<boolean> => {
      try {
        return commCoreModule.moveDraft(prevKey, nextKey);
      } catch (e) {
        if (!checkIfTaskWasCancelled(e)) {
          throw e;
        }
      }
      return false;
    },
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
