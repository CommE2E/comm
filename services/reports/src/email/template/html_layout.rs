use maud::{html, Markup, PreEscaped, DOCTYPE};

pub fn render_page(body: Markup) -> String {
  let markup = html! {
    (DOCTYPE)
    html lang="en" {
      head {
        meta charset="utf-8";
        style { (PreEscaped(CSS)) }
      }
      body {
        (body)
      }
    }
  };

  markup.into_string()
}

const CSS: &str = r#"
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  color: #333;
  line-height: 1.5;
}

h2 {
  font-size: 24px;
  color: #222;
  margin: 0 0 10px;
  padding: 0;
}

h3 {
  font-size: 18px;
  color: #444;
  margin: 0 0 8px;
  padding: 0;
}

h4 {
  font-size: 16px;
  color: #555;
  margin: 0;
  padding: 0;
}

p {
  margin: 0 0 10px;
  padding: 0;
}

b {
  font-weight: bold;
}

em {
  font-style: italic;
}

code {
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 2px;
  font-family: monospace;
}

pre {
  background-color: #f0f0f0;
  padding: 10px;
  font-family: monospace;
  overflow: auto;
}

ul {
  margin: 0 0 10px 20px;
  padding: 0;
}

a {
  color: #007bff;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
"#;
