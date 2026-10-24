{
  description = "MoneyPrinterOmni - dev shell and launcher (Python deps are managed by uv.lock)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs:
        let
          python = pkgs.python311; # .python-version = 3.11, requires-python >= 3.11

          # Shared libraries needed by the manylinux wheels pulled in by uv
          # (av, azure-cognitiveservices-speech, onnxruntime, numpy, ...).
          runtimeLibs = with pkgs; [
            stdenv.cc.cc.lib
            zlib
            openssl
            libffi
            ffmpeg
          ];
        in
        {
          default = pkgs.mkShell {
            packages = [
              python
              pkgs.uv
              pkgs.ffmpeg # moviepy / bgm validation; imageio-ffmpeg also bundles one
              pkgs.imagemagick # optional text rendering fallback for moviepy
              pkgs.git
              pkgs.nodejs_24 # animations/ (Remotion); versão em animations/.nvmrc
              pkgs.chromium # render do Remotion sem baixar browser em runtime
              pkgs.yt-dlp # MCP `yt-dlp` (.mcp.json) e .agents/playbooks/yt-dlp.md
            ];

            env = {
              UV_PYTHON = "${python}/bin/python";
              UV_PYTHON_DOWNLOADS = "never";
              PUPPETEER_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
            };

            shellHook = ''
              [ -d animations/node_modules ] || echo "hint: npm ci --prefix animations   (Remotion)"
              export PYTHONPATH="$PWD''${PYTHONPATH:+:$PYTHONPATH}"
              export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath runtimeLibs}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
              [ -f config.toml ] || echo "hint: cp config.example.toml config.toml"
              # Aviso de atualização (silencioso se em dia ou offline; no máx. 1 consulta a cada 6 h).
              # Desligue com MPT_NO_UPDATE_CHECK=1.
              [ -z "''${MPT_NO_UPDATE_CHECK:-}" ] && [ -x ./update.sh ] && ./update.sh --check --quiet || true
              echo "run: uv sync --frozen && ./webui.sh   (add --extra twelvelabs if needed)"
            '';
          };
        });

      # `nix run` -> sync deps with uv, then start the WebUI.
      apps = forAllSystems (pkgs:
        let
          python = pkgs.python311;
          runtimeLibs = with pkgs; [ stdenv.cc.cc.lib zlib openssl libffi ffmpeg ];
          launcher = pkgs.writeShellScript "mpt-webui" ''
            export PATH="${pkgs.lib.makeBinPath [ python pkgs.uv pkgs.ffmpeg pkgs.imagemagick pkgs.nodejs_24 ]}:$PATH"
            export UV_PYTHON="${python}/bin/python"
            export UV_PYTHON_DOWNLOADS=never
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath runtimeLibs}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
            uv sync --frozen || exit 1
            exec sh ./webui.sh "$@"
          '';
        in
        {
          default = {
            type = "app";
            program = "${launcher}";
          };
        });
    };
}
