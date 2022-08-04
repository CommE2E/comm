#include "BackupServiceImpl.h"

#include <aws/core/Aws.h>

namespace comm {
namespace network {

BackupServiceImpl::BackupServiceImpl() {
  Aws::InitAPI({});
}

BackupServiceImpl::~BackupServiceImpl() {
  Aws::ShutdownAPI({});
}

grpc::ServerBidiReactor<
    backup::TalkWithClientRequest,
    backup::TalkWithClientResponse> *
BackupServiceImpl::TalkWithClient(grpc::CallbackServerContext *context) {
  return new reactor::TalkWithClientReactor();
}

} // namespace network
} // namespace comm
