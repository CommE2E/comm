#include <DatabaseManagers/SQLiteQueryExecutor.h>
#include <PersistentStorageUtilities/ThreadOperationsUtilities/ThreadOperations.h>
#include <PersistentStorageUtilities/ThreadOperationsUtilities/ThreadOperationsJNIHelper.h>

namespace comm {
void ThreadOperationsJNIHelper::updateSQLiteUnreadStatus(
    facebook::jni::alias_ref<ThreadOperationsJNIHelper> jThis,
    std::string sqliteFilePath,
    std::string threadID,
    bool unread) {
  SQLiteQueryExecutor::initialize(sqliteFilePath);
  ThreadOperations::updateSQLiteUnreadStatus(threadID, unread);
}

void ThreadOperationsJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod(
          "updateSQLiteUnreadStatus",
          ThreadOperationsJNIHelper::updateSQLiteUnreadStatus),
  });
}
} // namespace comm
