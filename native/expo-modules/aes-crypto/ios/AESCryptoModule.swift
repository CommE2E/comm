import ExpoModulesCore

public class AESCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AESCrypto")

    Function("hello") { () -> String in
      return "Hello world! 👋"
    }
  }
}
