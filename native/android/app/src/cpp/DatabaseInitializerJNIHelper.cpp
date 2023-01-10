#include <DatabaseManagers/DatabaseManager.h>
#include <DatabaseManagers/SQLiteQueryExecutor.h>
#include <InternalModules/DatabaseInitializerJNIHelper.h>

namespace comm {
void DatabaseInitializerJNIHelper::initializeDatabaseManager(
    facebook::jni::alias_ref<DatabaseInitializerJNIHelper> jThis,
    std::string sqliteFilePath) {
  SQLiteQueryExecutor::initialize(sqliteFilePath);
  DatabaseManager::initializeQueryExecutor();
}

void DatabaseInitializerJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod(
          "initializeDatabaseManager",
          DatabaseInitializerJNIHelper::initializeDatabaseManager),
  });
}
} // namespace comm
