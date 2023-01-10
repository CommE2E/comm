#include <DatabaseManagers/DatabaseManager.h>
#include <InternalModules/DatabaseInitializerJNIHelper.h>

namespace comm {
void DatabaseInitializerJNIHelper::initializeDatabaseManager(
    facebook::jni::alias_ref<DatabaseInitializerJNIHelper> jThis,
    std::string sqliteFilePath) {
  DatabaseManager::initializeQueryExecutor(sqliteFilePath);
}

void DatabaseInitializerJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod(
          "initializeDatabaseManager",
          DatabaseInitializerJNIHelper::initializeDatabaseManager),
  });
}
} // namespace comm
