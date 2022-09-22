// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { commCoreModule } from '../native-modules';
import { type CoreData, defaultCoreData, CoreDataContext } from './core-data';

type Props = {
  +children: React.Node,
};
function CoreDataProvider(props: Props): React.Node {
  const [draftCache, setDraftCache] = React.useState<
    $PropertyType<$PropertyType<CoreData, 'drafts'>, 'data'>,
  >(defaultCoreData.drafts.data);

  React.useEffect(() => {
    (async () => {
      const fetchedDrafts = await commCoreModule.getAllDrafts();
      setDraftCache(prevDrafts => {
        const mergedDrafts = {};
        for (const draftObj of fetchedDrafts) {
          mergedDrafts[draftObj.key] = draftObj.text;
        }
        for (const key in prevDrafts) {
          const value = prevDrafts[key];
          if (!value) {
            continue;
          }
          mergedDrafts[key] = value;
        }
        return mergedDrafts;
      });
    })();
  }, []);

  const removeAllDrafts = React.useCallback(async () => {
    const oldDrafts = draftCache;
    setDraftCache({});
    try {
      return await commCoreModule.removeAllDrafts();
    } catch (e) {
      setDraftCache(oldDrafts);
      throw e;
    }
  }, [draftCache]);

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const prevViewerIDRef = React.useRef();
  React.useEffect(() => {
    if (!viewerID) {
      return;
    }
    if (prevViewerIDRef.current === viewerID) {
      return;
    }
    if (prevViewerIDRef.current) {
      removeAllDrafts();
    }
    prevViewerIDRef.current = viewerID;
  }, [viewerID, removeAllDrafts]);

  /**
   * wrapper for updating the draft state receiving an array of drafts
   *  if you want to add/update the draft, pass the draft with non-empty text
   *  if you pass a draft with !!text == false
   * it will remove this entry from the cache
   */
  const setDrafts = React.useCallback(
    (newDrafts: $ReadOnlyArray<{ +key: string, +text: ?string }>) => {
      setDraftCache(prevDrafts => {
        const result = { ...prevDrafts };
        newDrafts.forEach(draft => {
          if (draft.text) {
            result[draft.key] = draft.text;
          } else {
            delete result[draft.key];
          }
        });
        return result;
      });
    },
    [],
  );
  const updateDraft = React.useCallback(
    async (draft: { +key: string, +text: string }) => {
      const prevDraftText = draftCache[draft.key];
      setDrafts([draft]);
      try {
        return await commCoreModule.updateDraft(draft);
      } catch (e) {
        setDrafts([{ key: draft.key, text: prevDraftText }]);
        throw e;
      }
    },
    [draftCache, setDrafts],
  );

  const moveDraft = React.useCallback(
    async (prevKey: string, newKey: string) => {
      const value = draftCache[prevKey];
      if (!value) {
        return false;
      }
      setDrafts([
        { key: newKey, text: value },
        { key: prevKey, text: null },
      ]);
      try {
        return await commCoreModule.moveDraft(prevKey, newKey);
      } catch (e) {
        setDrafts([
          { key: newKey, text: null },
          { key: prevKey, text: value },
        ]);
        throw e;
      }
    },
    [draftCache, setDrafts],
  );

  const coreData = React.useMemo(
    () => ({
      drafts: {
        data: draftCache,
        updateDraft,
        moveDraft,
      },
    }),
    [draftCache, updateDraft, moveDraft],
  );

  return (
    <CoreDataContext.Provider value={coreData}>
      {props.children}
    </CoreDataContext.Provider>
  );
}

export default CoreDataProvider;
