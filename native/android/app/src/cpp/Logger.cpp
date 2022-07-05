#include <Tools/Logger.h>

#include <android/log.h>

namespace comm {

void Logger::log(const std::string str) {
  __android_log_print(ANDROID_LOG_VERBOSE, "COMM", "%s", str.c_str());
};

} // namespace comm
