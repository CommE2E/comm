/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * @generated by codegen project: GenerateModuleH.js
 */

#pragma once

#include <ReactCommon/TurboModule.h>
#include <react/bridging/Bridging.h>

namespace facebook {
namespace react {

class JSI_EXPORT CommUtilsModuleSchemaCxxSpecJSI : public TurboModule {
protected:
  CommUtilsModuleSchemaCxxSpecJSI(std::shared_ptr<CallInvoker> jsInvoker);

public:
  virtual jsi::Value writeBufferToFile(jsi::Runtime &rt, jsi::String path, jsi::Object data) = 0;
  virtual jsi::Value readBufferFromFile(jsi::Runtime &rt, jsi::String path) = 0;
  virtual jsi::String base64EncodeBuffer(jsi::Runtime &rt, jsi::Object data) = 0;
  virtual jsi::Object base64DecodeBuffer(jsi::Runtime &rt, jsi::String base64) = 0;
  virtual jsi::String sha256(jsi::Runtime &rt, jsi::Object data) = 0;

};

template <typename T>
class JSI_EXPORT CommUtilsModuleSchemaCxxSpec : public TurboModule {
public:
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override {
    return delegate_.get(rt, propName);
  }

protected:
  CommUtilsModuleSchemaCxxSpec(std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("CommUtilsTurboModule", jsInvoker),
      delegate_(static_cast<T*>(this), jsInvoker) {}

private:
  class Delegate : public CommUtilsModuleSchemaCxxSpecJSI {
  public:
    Delegate(T *instance, std::shared_ptr<CallInvoker> jsInvoker) :
      CommUtilsModuleSchemaCxxSpecJSI(std::move(jsInvoker)), instance_(instance) {}

    jsi::Value writeBufferToFile(jsi::Runtime &rt, jsi::String path, jsi::Object data) override {
      static_assert(
          bridging::getParameterCount(&T::writeBufferToFile) == 3,
          "Expected writeBufferToFile(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::writeBufferToFile, jsInvoker_, instance_, std::move(path), std::move(data));
    }
    jsi::Value readBufferFromFile(jsi::Runtime &rt, jsi::String path) override {
      static_assert(
          bridging::getParameterCount(&T::readBufferFromFile) == 2,
          "Expected readBufferFromFile(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::readBufferFromFile, jsInvoker_, instance_, std::move(path));
    }
    jsi::String base64EncodeBuffer(jsi::Runtime &rt, jsi::Object data) override {
      static_assert(
          bridging::getParameterCount(&T::base64EncodeBuffer) == 2,
          "Expected base64EncodeBuffer(...) to have 2 parameters");

      return bridging::callFromJs<jsi::String>(
          rt, &T::base64EncodeBuffer, jsInvoker_, instance_, std::move(data));
    }
    jsi::Object base64DecodeBuffer(jsi::Runtime &rt, jsi::String base64) override {
      static_assert(
          bridging::getParameterCount(&T::base64DecodeBuffer) == 2,
          "Expected base64DecodeBuffer(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Object>(
          rt, &T::base64DecodeBuffer, jsInvoker_, instance_, std::move(base64));
    }
    jsi::String sha256(jsi::Runtime &rt, jsi::Object data) override {
      static_assert(
          bridging::getParameterCount(&T::sha256) == 2,
          "Expected sha256(...) to have 2 parameters");

      return bridging::callFromJs<jsi::String>(
          rt, &T::sha256, jsInvoker_, instance_, std::move(data));
    }

  private:
    T *instance_;
  };

  Delegate delegate_;
};

} // namespace react
} // namespace facebook
