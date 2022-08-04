#include "BlobServiceImpl.h"

#include "TalkReactor.h"

#include <glog/logging.h>

#include <memory>

namespace comm {
namespace network {

BlobServiceImpl::BlobServiceImpl() {
  Aws::InitAPI({});
}

BlobServiceImpl::~BlobServiceImpl() {
  Aws::ShutdownAPI({});
}

grpc::ServerBidiReactor<blob::TalkBetweenServicesRequest, blob::TalkBetweenServicesResponse> *
BlobServiceImpl::TalkBetweenServices(grpc::CallbackServerContext *context) {
  return new reactor::TalkReactor();
}

} // namespace network
} // namespace comm
