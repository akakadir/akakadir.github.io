# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name     = "axel"
  spec.version  = "1.33.7"
  spec.authors  = ["akakadir"]
  spec.email    = ["k4dir.semih@gmail.com"]

  spec.summary  = "axel.akakadir"
  spec.homepage = "https://github.com/akakadir/akakadir.github.io"
  spec.license  = "MIT"

  spec.metadata["plugin_type"] = "theme"

  spec.add_runtime_dependency "jekyll", "~> 3.10.0"
  spec.add_runtime_dependency "jekyll-feed", "~> 0.17.0"
  spec.add_runtime_dependency "jekyll-seo-tag", "~> 2.8.0"
  spec.add_runtime_dependency "jektex", "~> 0.1.1"

end