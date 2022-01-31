#pragma once

#include <ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

using namespace facebook;

class JSI_EXPORT GRPCStreamHostObject : public jsi::HostObject {
public:
  GRPCStreamHostObject(
      jsi::Runtime &rt,
      std::shared_ptr<react::CallInvoker> jsInvoker);
  jsi::Value get(jsi::Runtime &, const jsi::PropNameID &name) override;
  void set(jsi::Runtime &, const jsi::PropNameID &name, const jsi::Value &value)
      override;
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

private:
  int readyState;
  jsi::Value onopen;
  jsi::Value onmessage;
  jsi::Value onclose;
  jsi::Value send;
  jsi::Value close;
  std::shared_ptr<react::CallInvoker> jsInvoker;
};
