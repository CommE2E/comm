#pragma once

#include <fbjni/fbjni.h>

namespace comm {
class StaffUtilsJNIHelper
    : public facebook::jni::JavaClass<StaffUtilsJNIHelper> {
public:
  static auto constexpr kJavaDescriptor = "Lapp/comm/android/fbjni/StaffUtils;";
  static bool
  isStaffRelease(facebook::jni::alias_ref<StaffUtilsJNIHelper> jThis);
  static void registerNatives();
};

} // namespace comm
