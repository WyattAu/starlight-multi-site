# Scratch site

Minimal Starlight site used by CI to verify the `createConfig()` factory against
a real Starlight install. The site config is driven by `createConfig()` with
`name: "alpha"` and `domain: "alpha.example.com"`, so the build must emit to
`dist/alpha/` with URLs pointing at the configured domain. `sites.toml` is the
same manifest exercised by the CLI `validate`/`list` commands.
