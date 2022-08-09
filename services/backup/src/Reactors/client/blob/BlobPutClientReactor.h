#pragma once

#include "Constants.h"
#include "GlobalConstants.h"

#include "blob.grpc.pb.h"
#include "blob.pb.h"

#include "ClientBidiReactorBase.h"

#include <folly/MPMCQueue.h>
#include <grpcpp/grpcpp.h>

#include <condition_variable>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class BlobPutClientReactor
    : public ClientBidiReactorBase<blob::PutRequest, blob::PutResponse> {

  enum class State {
    SEND_HOLDER = 0,
    SEND_HASH = 1,
    SEND_CHUNKS = 2,
  };

  State state = State::SEND_HOLDER;
  const std::string hash;
  const std::string holder;
  size_t currentDataSize = 0;
  const size_t chunkSize =
      GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE;
  folly::MPMCQueue<std::string> dataChunks;
  std::condition_variable *terminationNotifier;

public:
  BlobPutClientReactor(
      const std::string &holder,
      const std::string &hash,
      std::condition_variable *terminationNotifier);
  void scheduleSendingDataChunk(std::unique_ptr<std::string> dataChunk);
  std::unique_ptr<grpc::Status> prepareRequest(
      blob::PutRequest &request,
      std::shared_ptr<blob::PutResponse> previousResponse) override;
  void doneCallback() override;
};

} // namespace reactor
} // namespace network
} // namespace comm
