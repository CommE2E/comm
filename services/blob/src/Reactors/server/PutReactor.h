#pragma once

#include "ServerBidiReactorBase.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <memory>
#include <string>
#include <thread>

namespace comm {
namespace network {
namespace reactor {

class PutReactor
    : public ServerBidiReactorBase<blob::PutRequest, blob::PutResponse> {
  std::string holder;
  std::string blobHash;
  std::string currentChunk;
  std::unique_ptr<database::S3Path> s3Path;
  std::shared_ptr<database::BlobItem> blobItem;
  std::unique_ptr<MultiPartUploader> uploader;
  bool dataExists = false;

public:
  std::unique_ptr<ServerBidiReactorStatus> handleRequest(
      blob::PutRequest request,
      blob::PutResponse *response) override {
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[PutReactor::handleRequest] enter";
    if (this->holder.empty()) {
      if (request.holder().empty()) {
        throw std::runtime_error("holder has not been provided");
      }
      this->holder = request.holder();
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[PutReactor::handleRequest] holder " << this->holder;
      return nullptr;
    }
    // this never gets called in some cases
    // the blob receives only the holder
    if (this->blobHash.empty()) {
      if (request.blobhash().empty()) {
        throw std::runtime_error("blob hash has not been provided");
      }
      this->blobHash = request.blobhash();
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[PutReactor::handleRequest] blob hash " << this->blobHash;
      this->blobItem =
          database::DatabaseManager::getInstance().findBlobItem(this->blobHash);
      if (this->blobItem != nullptr) {
        this->s3Path =
            std::make_unique<database::S3Path>(this->blobItem->getS3Path());
        response->set_dataexists(true);
        this->dataExists = true;
        LOG(INFO) << "["
                  << std::hash<std::thread::id>{}(std::this_thread::get_id())
                  << "]"
                  << "[PutReactor::handleRequest] data exists";
        return std::make_unique<ServerBidiReactorStatus>(
            grpc::Status::OK, true);
      }
      this->s3Path = std::make_unique<database::S3Path>(
          tools::generateS3Path(BLOB_BUCKET_NAME, this->blobHash));
      this->blobItem =
          std::make_shared<database::BlobItem>(this->blobHash, *s3Path);
      response->set_dataexists(false);
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[PutReactor::handleRequest] data does not exist";
      return nullptr;
    }
    // never gets called
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[PutReactor::handleRequest] data chunk size: "
              << request.datachunk().size();
    if (request.datachunk().empty()) {
      return std::make_unique<ServerBidiReactorStatus>(grpc::Status(
          grpc::StatusCode::INVALID_ARGUMENT, "data chunk expected"));
    }
    if (this->uploader == nullptr) {
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[PutReactor::handleRequest] initialize MPU";
      this->uploader = std::make_unique<MultiPartUploader>(
          getS3Client(), BLOB_BUCKET_NAME, s3Path->getObjectName());
    }
    this->currentChunk += request.datachunk();
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[PutReactor::handleRequest] appending data chunk "
              << request.datachunk().size() << "/" << this->currentChunk.size()
              << "/" << AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE;
    if (this->currentChunk.size() > AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[PutReactor::handleRequest] adding chunk";
      this->uploader->addPart(this->currentChunk);
      this->currentChunk.clear();
    }
    return nullptr;
  }

  void terminateCallback() override {
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[PutReactor::terminateCallback]";
    if (!this->status.status.ok()) {
      return;
    }
    const database::ReverseIndexItem reverseIndexItem(
        this->holder, this->blobHash);
    if (this->uploader == nullptr) {
      if (!this->dataExists) {
        throw std::runtime_error("uploader not initialized as expected");
      }
      database::DatabaseManager::getInstance().putReverseIndexItem(
          reverseIndexItem);
      return;
    }
    if (!this->readingAborted) {
      return;
    }
    if (!currentChunk.empty()) {
      this->uploader->addPart(this->currentChunk);
    }
    this->uploader->finishUpload();
    database::DatabaseManager::getInstance().putBlobItem(*this->blobItem);
    database::DatabaseManager::getInstance().putReverseIndexItem(
        reverseIndexItem);
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
