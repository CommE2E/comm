use proc_macro::TokenStream;
use quote::quote;
use syn::{Attribute, Lit, Meta, NestedMeta};

pub fn impl_tag_aware_deserialize_macro(ast: &syn::DeriveInput) -> TokenStream {
  let name = &ast.ident;

  if !has_serde_remote_self(&ast.attrs) {
    panic!("{} must have #[serde(remote = \"Self\")] directive", name);
  }

  let Some(tag_value) = extract_tag_value(&ast.attrs) else {
    panic!("{} must have #[serde(tag = \"...\")] directive", name);
  };

  let gen = quote! {
    impl<'de> serde::de::Deserialize<'de> for #name {
      fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
      {
        use serde::de::Error;

        let this = serde_json::Value::deserialize(deserializer)?;
        if let Some(found_tag) = this.get(#tag_value) {
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

/// Reads the `#[serde(tag = "...")]` value
fn extract_tag_value(attrs: &[Attribute]) -> Option<String> {
  let serde_attr = attrs.iter().find(|attr| attr.path.is_ident("serde"))?;
  if let Ok(Meta::List(meta_list)) = serde_attr.parse_meta() {
    for nested in meta_list.nested {
      if let NestedMeta::Meta(Meta::NameValue(name_value)) = nested {
        if name_value.path.is_ident("tag") {
          if let Lit::Str(lit_str) = name_value.lit {
            return Some(lit_str.value());
          }
        }
      }
    }
  }
  None
}

/// Checks for the `#[serde(remote = "Self")]` attribute
fn has_serde_remote_self(attrs: &[Attribute]) -> bool {
  let Some(serde_attr) = attrs.iter().find(|attr| attr.path.is_ident("serde"))
  else {
    return false;
  };
  if let Ok(Meta::List(meta_list)) = serde_attr.parse_meta() {
    for nested in meta_list.nested {
      if let NestedMeta::Meta(Meta::NameValue(name_value)) = nested {
        if name_value.path.is_ident("remote") {
          return matches!(name_value.lit, Lit::Str(lit_str) if lit_str.value() == "Self");
        }
      }
    }
  }
  false
}
