#include "Tools.h"

#include <chrono>

namespace comm {
namespace network {

uint64_t getCurrentTimestamp() {
  using namespace std::chrono;
  return duration_cast<milliseconds>(system_clock::now().time_since_epoch())
      .count();
}

} // namespace network
} // namespace comm
