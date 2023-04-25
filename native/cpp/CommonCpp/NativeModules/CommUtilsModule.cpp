#include "CommUtilsModule.h"
#include "../Tools/Base64.h"
#include "olm/olm.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <fstream>
#include <string>

namespace comm {

using namespace facebook::react;

CommUtilsModule::CommUtilsModule(std::shared_ptr<CallInvoker> jsInvoker)
    : CommUtilsModuleSchemaCxxSpecJSI(jsInvoker),
      utilsThread(std::make_unique<WorkerThread>("utils")),
      olmUtilityBuffer(::olm_utility_size()) {
  this->olmUtility = ::olm_utility(olmUtilityBuffer.data());
}

jsi::Value CommUtilsModule::writeBufferToFile(
    jsi::Runtime &rt,
    jsi::String path,
    jsi::Object data) {
  auto arrayBuffer = data.getArrayBuffer(rt);
  auto size = arrayBuffer.size(rt);
  auto dataPtr = arrayBuffer.data(rt);
  auto filePath = path.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          try {
            std::ofstream file;
            file.exceptions(std::fstream::failbit | std::fstream::badbit);
            file.open(filePath, std::ios::binary);
            file.write((char *)dataPtr, size);
            file.close();
          } catch (const std::exception &e) {
            error = "Failed to write file " + filePath + ": " + e.what();
          }

          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        this->utilsThread->scheduleTask(job);
      });
}

jsi::Value
CommUtilsModule::readBufferFromFile(jsi::Runtime &rt, jsi::String path) {
  auto filePath = path.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::streampos file_size;
          std::shared_ptr<uint8_t> data{nullptr};
          try {
            // Open a file
            std::ifstream file;
            file.exceptions(std::fstream::failbit | std::fstream::badbit);
            file.open(filePath, std::ios::binary);

            // Get file size
            std::streampos current_pos = file.tellg();
            file.seekg(0, std::ios::end);
            file_size = file.tellg();
            file.seekg(current_pos);

            // Read file content
            data = std::shared_ptr<uint8_t>{new uint8_t[file_size]};
            file.read((char *)data.get(), file_size);
            file.close();
          } catch (const std::exception &e) {
            error = "Failed to read file " + filePath + ": " + e.what();
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto arrayBuffer =
                innerRt.global()
                    .getPropertyAsFunction(innerRt, "ArrayBuffer")
                    // ArrayBuffer constructor takes one parameter: byte length
                    .callAsConstructor(
                        innerRt, {static_cast<double>(file_size)})
                    .asObject(innerRt)
                    .getArrayBuffer(innerRt);
            auto bufferPtr = arrayBuffer.data(innerRt);
            memcpy((void *)bufferPtr, data.get(), file_size);
            promise->resolve(std::move(arrayBuffer));
          });
        };
        this->utilsThread->scheduleTask(job);
      });
}

jsi::String
CommUtilsModule::base64EncodeBuffer(jsi::Runtime &rt, jsi::Object data) {
  auto arrayBuffer = data.getArrayBuffer(rt);
  auto dataPtr = arrayBuffer.data(rt);
  auto size = arrayBuffer.size(rt);

  auto bytes = std::vector<uint8_t>{dataPtr, dataPtr + size};
  auto base64 = Base64::encode(bytes);
  return jsi::String::createFromUtf8(rt, base64);
}

jsi::String CommUtilsModule::sha256(jsi::Runtime &rt, jsi::Object data) {
  auto arrayBuffer = data.getArrayBuffer(rt);
  auto inputPtr = arrayBuffer.data(rt);
  auto inputSize = arrayBuffer.size(rt);

  auto sha256Size = ::olm_sha256_length(this->olmUtility);
  OlmBuffer sha256Bytes(sha256Size);
  auto outputLength = ::olm_sha256(
      this->olmUtility, inputPtr, inputSize, sha256Bytes.data(), sha256Size);
  if (outputLength == std::size_t(-1)) {
    throw jsi::JSError(
        rt,
        "olm error: " +
            std::string{::olm_utility_last_error(this->olmUtility)});
  }

  std::string sha256String{sha256Bytes.begin(), sha256Bytes.end()};
  return jsi::String::createFromUtf8(rt, sha256String);
}

} // namespace comm
