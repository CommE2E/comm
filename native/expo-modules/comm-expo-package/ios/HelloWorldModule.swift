import ExpoModulesCore

public class HelloWorldModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HelloWorld")

    Function("sayHello") { () -> String in
      "Hello"
    }
  }
}

