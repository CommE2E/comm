#include "InnerServiceImpl.h"

#include "TalkReactor.h"

#include <memory>

namespace comm {
namespace network {

InnerServiceImpl::InnerServiceImpl() {
  Aws::InitAPI({});
}

InnerServiceImpl::~InnerServiceImpl() {
  Aws::ShutdownAPI({});
}

grpc::ServerBidiReactor<
    inner::TalkBetweenServicesRequest,
    inner::TalkBetweenServicesResponse> *
InnerServiceImpl::TalkBetweenServices(grpc::CallbackServerContext *context) {
  return new reactor::TalkReactor();
}

} // namespace network
} // namespace comm
