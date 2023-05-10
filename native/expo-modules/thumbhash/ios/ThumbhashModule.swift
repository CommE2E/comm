import ExpoModulesCore

public class ThumbhashModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Thumbhash")

    AsyncFunction("generateThumbHash") { () -> String in
      "unimplemented"
    }
  }
}
