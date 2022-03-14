#include "BlobServiceImpl.h"

#include "AwsTools.h"
#include "Constants.h"
#include "DatabaseManager.h"
#include "MultiPartUploader.h"
#include "Tools.h"

#include <iostream>
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
  const std::string computedBlobHash = computeHashForFile(s3Path);
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
  return nullptr;
}

grpc::ServerWriteReactor<blob::GetResponse> *BlobServiceImpl::Get(
    grpc::CallbackServerContext *context,
    const blob::GetRequest *request) {
  return nullptr;
}

grpc::ServerUnaryReactor *BlobServiceImpl::Remove(
    grpc::CallbackServerContext *context,
    const blob::RemoveRequest *request,
    google::protobuf::Empty *response) {
  return nullptr;
}

} // namespace network
} // namespace comm
