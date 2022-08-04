#include "OuterServiceImpl.h"

#include <aws/core/Aws.h>

namespace comm {
namespace network {

OuterServiceImpl::OuterServiceImpl() {
  Aws::InitAPI({});
}

OuterServiceImpl::~OuterServiceImpl() {
  Aws::ShutdownAPI({});
}

grpc::ServerBidiReactor<
    outer::TalkWithClientRequest,
    outer::TalkWithClientResponse> *
OuterServiceImpl::TalkWithClient(grpc::CallbackServerContext *context) {
  return new reactor::TalkWithClientReactor();
}

} // namespace network
} // namespace comm
