#pragma once

#include "PakeAuthenticationHandler.h"
#include "WalletAuthenticationHandler.h"

#include "../_generated/backup.pb.h"

#include <memory>

namespace comm {
namespace network {
namespace auth {

enum class AuthenticationState {
  IN_PROGRESS = 1,
  SUCCESS = 2,
  FAIL = 3,
};

class AuthenticationManager {
  AuthenticationState state = AuthenticationState::IN_PROGRESS;
  std::unique_ptr<PakeAuthenticationHandler> pakeAuthenticationHandler;
  std::unique_ptr<WalletAuthenticationHandler> walletAuthenticationHandler;

public:
  AuthenticationState getState() const;
  backup::FullAuthenticationResponseData
  processRequest(const backup::FullAuthenticationRequestData &request);
};

} // namespace auth
} // namespace network
} // namespace comm
