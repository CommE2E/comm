// Rust library integration header
#pragma once

namespace comm {
namespace rust {
namespace notifications {
extern "C" bool sendNotifToAPNS(
    char const *certificatePath,
    char const *certificatePassword,
    char const *deviceToken,
    char const *message,
    bool const *sandbox);
} // namespace notifications
} // namespace rust
} // namespace comm
