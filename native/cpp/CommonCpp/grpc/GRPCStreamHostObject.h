#pragma once

#import <jsi/jsi.h>

using namespace facebook;

class JSI_EXPORT GRPCStreamHostObject : public jsi::HostObject {
public:
  GRPCStreamHostObject();
  jsi::Value get(jsi::Runtime &, const jsi::PropNameID &name) override;
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

private:
  int readyState;
};
