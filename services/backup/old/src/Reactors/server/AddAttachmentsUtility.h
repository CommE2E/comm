#pragma once

#include "LogItem.h"

#include "backup.grpc.pb.h"
#include "backup.pb.h"

#include <grpcpp/grpcpp.h>
#include <memory>

namespace comm {
namespace network {
namespace reactor {

class AddAttachmentsUtility {
  std::shared_ptr<database::LogItem>
  moveToS3(std::shared_ptr<database::LogItem> logItem);

public:
  grpc::Status processRequest(const backup::AddAttachmentsRequest *request);
};

} // namespace reactor
} // namespace network
} // namespace comm
