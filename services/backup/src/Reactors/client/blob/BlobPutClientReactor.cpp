#include "BlobPutClientReactor.h"

#include <thread>

namespace comm {
namespace network {
namespace reactor {

BlobPutClientReactor::BlobPutClientReactor(
    const std::string &holder,
    const std::string &hash,
    std::condition_variable *terminationNotifier)
    : holder(holder),
      hash(hash),
      dataChunks(folly::MPMCQueue<std::string>(100)),
      terminationNotifier(terminationNotifier) {
}

void BlobPutClientReactor::scheduleSendingDataChunk(
    std::unique_ptr<std::string> dataChunk) {
  const size_t size = dataChunk->size();
  LOG(INFO)
      << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id()) << "]"
      << "[BlobPutClientReactor::scheduleSendingDataChunk] data chunk size "
      << size;
  if (!this->dataChunks.write(std::move(*dataChunk))) {
    throw std::runtime_error(
        "Error scheduling sending a data chunk to send to the blob service");
  }
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[BlobPutClientReactor::scheduleSendingDataChunk] scheduled "
               "data chunk size "
            << size;
}

// for some reason the whole data is being sent to the blob but on the blob side
// only the holder is being read
std::unique_ptr<grpc::Status> BlobPutClientReactor::prepareRequest(
    blob::PutRequest &request,
    std::shared_ptr<blob::PutResponse> previousResponse) {
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[BlobPutClientReactor::prepareRequest] enter";
  if (this->state == State::SEND_HOLDER) {
    this->request.set_holder(this->holder);
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[BlobPutClientReactor::prepareRequest] holder "
              << this->holder;
    this->state = State::SEND_HASH;
    // only sends holder, doesn't go further - now it does, maybe sometimes?
    return nullptr;
  }
  if (this->state == State::SEND_HASH) {
    request.set_blobhash(this->hash);
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[BlobPutClientReactor::prepareRequest] hash " << this->hash;
    this->state = State::SEND_CHUNKS;
    return nullptr;
  }
  // not even called ever
  if (this->state != State::SEND_CHUNKS) {
    throw std::runtime_error(
        "invalid state " + std::to_string(int(this->state)) + " expected " +
        std::to_string(int(State::SEND_CHUNKS)));
  }
  // this is not even in logs anywhere :/ why?
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[BlobPutClientReactor::prepareRequest] data exists "
            << previousResponse->dataexists();
  if (previousResponse->dataexists()) {
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  std::string dataChunk;
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[BlobPutClientReactor::prepareRequest] reading data chunk";
  this->dataChunks.blockingRead(dataChunk);
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[BlobPutClientReactor::prepareRequest] read data chunk "
            << dataChunk.size();
  if (dataChunk.empty()) {
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  request.set_datachunk(dataChunk);
  return nullptr;
}

void BlobPutClientReactor::doneCallback() {
  // this never gets called
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[BlobPutClientReactor::doneCallback]";
  this->terminationNotifier->notify_one();
}

} // namespace reactor
} // namespace network
} // namespace comm
