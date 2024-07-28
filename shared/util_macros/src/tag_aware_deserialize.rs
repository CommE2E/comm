use proc_macro::TokenStream;
use quote::quote;

pub fn impl_tag_aware_deserialize_macro(ast: &syn::DeriveInput) -> TokenStream {
  let name = &ast.ident;

  let gen = quote! {
    impl<'de> serde::de::Deserialize<'de> for #name {
      fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
      {
        use serde::de::Error;

        let this = serde_json::Value::deserialize(deserializer)?;
        if let Some(found_tag) = this.get("type") {
          if found_tag == stringify!(#name) {
            // now we can run _original_ deserialize
            return match #name::deserialize(this) {
              Ok(object) => Ok(object),
              Err(err) => Err(Error::custom(err)),
            };
          }
        }
        Err(Error::custom(format!("Deserialized object is not a '{}'", stringify!(#name))))
      }
    }

    // We need a dummy `Serialize` impl for `remote = "Self"` to work
    impl Serialize for #name {
      fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
      where
        S: serde::Serializer,
      {
        Self::serialize(self, serializer)
      }
    }
  };
  gen.into()
}
