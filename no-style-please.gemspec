# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "retouched no-style-please"
  spec.version       = "1.0"
  spec.authors       = ["akakadir"]
  spec.email         = ["k4dir.semih@gmail.com"]

  spec.summary       = "akakadir"
  spec.homepage      = "https://github.com/akakadir/akakadir.github.io"
  spec.license       = "Apache-2.0"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_sass|LICENSE|README|_config\.yml)!i) }

  spec.add_runtime_dependency "jekyll", "~> 3.9.0"
  spec.add_runtime_dependency "jekyll-feed", "~> 0.15.1"
  spec.add_runtime_dependency "jekyll-seo-tag", "~> 2.7.1"

end
