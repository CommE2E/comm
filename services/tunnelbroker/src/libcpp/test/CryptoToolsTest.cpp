#include "CryptoTools.h"
#include "Constants.h"
#include "Tools.h"

#include <gtest/gtest.h>

#include <string>

using namespace comm::network;

class CryptoToolsTest : public testing::Test {};

TEST(CryptoToolsTest, RsaVerifyStringIsTrueOnValidSignature) {
  const std::string publicKeyBase64 =
      "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDGC8M8FdRSSEdfAufY/V5iP6cB"
      "crXdeZa19OjpbbNvq9qAT2FobnYrlNI8p3y/2LvJBxlR9VlvS0Nh4HLZLdmf8zOf"
      "3HyN0w8ey54xE5eIILZi1Xudrk8J+U5xij78Bzl2WdAvoVCiVbaodff8DBvmqHeR"
      "/EDcMX3ipPDzjcCFXwIDAQAB";
  const std::string verifyMessage = "testverifymessagetestverifymessage";
  const std::string validSignatureBase64 =
      "tn5w317+CcuUdK8JRvM0GW+m65ph7sHqlbpY5PhYZtl1hlb86ILgmlCaa+"
      "O7icLImcLQkVsabCaVkczrJOy95jvT251gAKBZAXc4oDNqg4n5An3GmwHzbh50Z40M9gwXG/"
      "zx6ReEYvgqDo9e1cimljewFykHt8ApBX6mbJ8ShyM=";
  EXPECT_EQ(
      crypto::rsaVerifyString(
          publicKeyBase64, verifyMessage, validSignatureBase64),
      true);
}

TEST(CryptoToolsTest, RsaVerifyStringIsFalseOnInvalidSignature) {
  const std::string publicKeyBase64 =
      "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDGC8M8FdRSSEdfAufY/V5iP6cB"
      "crXdeZa19OjpbbNvq9qAT2FobnYrlNI8p3y/2LvJBxlR9VlvS0Nh4HLZLdmf8zOf"
      "3HyN0w8ey54xE5eIILZi1Xudrk8J+U5xij78Bzl2WdAvoVCiVbaodff8DBvmqHeR"
      "/EDcMX3ipPDzjcCFXwIDAQAB";
  const std::string verifyMessage = "testverifymessagetestverifymessage";
  const std::string invalidSignatureBase64 =
      "Opuw317+CcuUdK8JRvM0GW+m65ph7sHqlbpY5PhYZtl1hlb86ILgmlCaa+"
      "O7icLImcLQkVsabCaVkczrJOy95jvT251gAKBZAXc4oDNqg4n5An3GmwHzbh50Z40M9gwXG/"
      "zx6ReEYvgqDo9e1cimljewFykHt8ApBX6mbJ8dfrM=";
  EXPECT_EQ(
      crypto::rsaVerifyString(
          publicKeyBase64, verifyMessage, invalidSignatureBase64),
      false);
}
