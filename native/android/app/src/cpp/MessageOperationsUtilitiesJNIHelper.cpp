#include "MessageOperationsUtilitiesJNIHelper.h"
#include "MessageOperationsUtilities.h"
#include "SQLiteQueryExecutor.h"

namespace comm {
void MessageOperationsUtilitiesJNIHelper::storeMessageInfos(
    facebook::jni::alias_ref<MessageOperationsUtilitiesJNIHelper> jThis,
    facebook::jni::JString sqliteFilePath,
    facebook::jni::JString rawMessageInfosString) {
  std::string sqliteFilePathCpp = sqliteFilePath.toStdString();
  std::string rawMessageInfosStringCpp = rawMessageInfosString.toStdString();
  SQLiteQueryExecutor::initialize(sqliteFilePathCpp);
  MessageOperationsUtilities::storeMessageInfos(rawMessageInfosStringCpp);
}

void MessageOperationsUtilitiesJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod(
          "storeMessageInfos",
          MessageOperationsUtilitiesJNIHelper::storeMessageInfos),
  });
}
} // namespace comm
