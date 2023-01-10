#pragma once

#include <fbjni/fbjni.h>

namespace comm {
class DatabaseInitializerJNIHelper
    : public facebook::jni::JavaClass<DatabaseInitializerJNIHelper> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/DatabaseInitializer;";
  static void initializeDatabaseManager(
      facebook::jni::alias_ref<DatabaseInitializerJNIHelper> jThis,
      std::string sqliteFilePath);
  static void registerNatives();
};
} // namespace comm
