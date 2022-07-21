#include "BlobServiceImpl.h"

#include "Constants.h"
#include "DatabaseManager.h"
#include "MultiPartUploader.h"
#include "S3Tools.h"
#include "Tools.h"

#include "GetReactor.h"
#include "PutReactor.h"

#include <glog/logging.h>

#include <memory>

namespace comm {
namespace network {

BlobServiceImpl::BlobServiceImpl() {
  Aws::InitAPI({});

  if (!getBucket(BLOB_BUCKET_NAME).isAvailable()) {
    throw std::runtime_error("bucket " + BLOB_BUCKET_NAME + " not available");
  }
}

BlobServiceImpl::~BlobServiceImpl() {
  Aws::ShutdownAPI({});
}

void BlobServiceImpl::verifyBlobHash(
    const std::string &expectedBlobHash,
    const database::S3Path &s3Path) {
  const std::string computedBlobHash = tools::computeHashForFile(s3Path);
  if (expectedBlobHash != computedBlobHash) {
    throw std::runtime_error(
        "blob hash mismatch, expected: [" + expectedBlobHash +
        "], computed: [" + computedBlobHash + "]");
  }
}

void BlobServiceImpl::assignVariableIfEmpty(
    const std::string &label,
    std::string &lvalue,
    const std::string &rvalue) {
  if (!lvalue.empty()) {
    throw std::runtime_error(
        "multiple assignment for variable " + label + " is not allowed");
  }
  lvalue = rvalue;
}

grpc::ServerBidiReactor<blob::PutRequest, blob::PutResponse> *
BlobServiceImpl::Put(grpc::CallbackServerContext *context) {
  return new reactor::PutReactor();
}

grpc::ServerWriteReactor<blob::GetResponse> *BlobServiceImpl::Get(
    grpc::CallbackServerContext *context,
    const blob::GetRequest *request) {

  reactor::GetReactor *gr = new reactor::GetReactor(request);
  gr->start();
  return gr;
}

grpc::ServerUnaryReactor *BlobServiceImpl::Remove(
    grpc::CallbackServerContext *context,
    const blob::RemoveRequest *request,
    google::protobuf::Empty *response) {
  grpc::Status status = grpc::Status::OK;
  const std::string holder = request->holder();
  try {
    std::shared_ptr<database::ReverseIndexItem> reverseIndexItem =
        database::DatabaseManager::getInstance().findReverseIndexItemByHolder(
            holder);
    if (reverseIndexItem == nullptr) {
      throw std::runtime_error("no item found for holder: " + holder);
    }
    // TODO handle cleanup here properly
    // for now the object's being removed right away
    const std::string blobHash = reverseIndexItem->getBlobHash();
    database::DatabaseManager::getInstance().removeReverseIndexItem(holder);
    if (database::DatabaseManager::getInstance()
            .findReverseIndexItemsByHash(reverseIndexItem->getBlobHash())
            .size() == 0) {
      database::S3Path s3Path = tools::findS3Path(*reverseIndexItem);
      AwsS3Bucket bucket = getBucket(s3Path.getBucketName());
      bucket.removeObject(s3Path.getObjectName());

      database::DatabaseManager::getInstance().removeBlobItem(blobHash);
    }
  } catch (std::runtime_error &e) {
    LOG(ERROR) << e.what();
    status = grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  auto *reactor = context->DefaultReactor();
  reactor->Finish(status);
  return reactor;
}

} // namespace network
} // namespace comm
