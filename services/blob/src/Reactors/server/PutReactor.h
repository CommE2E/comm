#pragma once

#include "ServerBidiReactorBase.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <memory>
#include <string>

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
    if (this->holder.empty()) {
      if (request.holder().empty()) {
        throw std::runtime_error("holder has not been provided");
      }
      this->holder = request.holder();
      return nullptr;
    }
    if (this->blobHash.empty()) {
      if (request.blobhash().empty()) {
        throw std::runtime_error("blob hash has not been provided");
      }
      this->blobHash = request.blobhash();
      this->blobItem =
          database::DatabaseManager::getInstance().findBlobItem(this->blobHash);
      if (this->blobItem != nullptr) {
        this->s3Path =
            std::make_unique<database::S3Path>(this->blobItem->getS3Path());
        response->set_dataexists(true);
        this->dataExists = true;
        return std::make_unique<ServerBidiReactorStatus>(
            grpc::Status::OK, true);
      }
      this->s3Path = std::make_unique<database::S3Path>(
          generateS3Path(BLOB_BUCKET_NAME, this->blobHash));
      this->blobItem =
          std::make_shared<database::BlobItem>(this->blobHash, *s3Path);
      response->set_dataexists(false);
      return nullptr;
    }
    std::cout << "here data chunk " << request.datachunk().size() << std::endl;
    if (request.datachunk().empty()) {
      return std::make_unique<ServerBidiReactorStatus>(grpc::Status(
          grpc::StatusCode::INVALID_ARGUMENT, "data chunk expected"));
    }
    if (this->uploader == nullptr) {
      this->uploader = std::make_unique<MultiPartUploader>(
          getS3Client(), BLOB_BUCKET_NAME, s3Path->getObjectName());
    }
    this->currentChunk += request.datachunk();
    if (this->currentChunk.size() > AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
      this->uploader->addPart(this->currentChunk);
      this->currentChunk.clear();
    }
    return nullptr;
  }

  void doneCallback() override {
    if (!this->getStatus().status.ok()) {
      return;
    }
    if (this->uploader == nullptr && !this->dataExists) {
      throw std::runtime_error("uploader not initialized as expected");
    }
    if (this->uploader == nullptr) {
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
    const database::ReverseIndexItem reverseIndexItem(holder, this->blobHash);
    database::DatabaseManager::getInstance().putReverseIndexItem(
        reverseIndexItem);
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
