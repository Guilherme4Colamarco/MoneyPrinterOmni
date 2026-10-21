{
  description = "MoneyPrinterOmni - dev shell and launcher (Python deps are managed by uv.lock)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      # natsukium/mcp-servers-nix does not package these two community servers, so
      # they are pinned npx wrappers. Secrets never go in the Nix store: Reddit
      # credentials are read from the process environment at runtime.
      mkMcp = pkgs:
        let
          mkPinnedNpxMcp = { name, npmSpec, extraInputs ? [ ], preamble ? "" }:
            pkgs.writeShellApplication {
              inherit name;
              runtimeInputs = [ pkgs.nodejs_24 ] ++ extraInputs;
              text = ''
                export NPM_CONFIG_FUND=false
                export NPM_CONFIG_AUDIT=false
                export NPM_CONFIG_UPDATE_NOTIFIER=false
                ${preamble}
                exec npx --yes "${npmSpec}" "$@"
              '';
            };

          yt-dlp-mcp = mkPinnedNpxMcp {
            name = "yt-dlp-mcp";
            npmSpec = "@kevinwatt/yt-dlp-mcp@0.10.0";
            extraInputs = [ pkgs.yt-dlp pkgs.ffmpeg ];
            # The server refuses to start unless its downloads dir exists.
            # Keep secrets out of the store; override at runtime with YTDLP_DOWNLOADS_DIR.
            preamble = ''
              : "''${YTDLP_DOWNLOADS_DIR:=''${XDG_CACHE_HOME:-$HOME/.cache}/yt-dlp-mcp}"
              export YTDLP_DOWNLOADS_DIR
              mkdir -p "$YTDLP_DOWNLOADS_DIR"
            '';
          };

          reddit-mcp-buddy = mkPinnedNpxMcp {
            name = "reddit-mcp-buddy";
            npmSpec = "reddit-mcp-buddy@1.1.14";
          };

          mcpConfig = (pkgs.formats.json { }).generate "mcp.json" {
            mcpServers = {
              yt-dlp = {
                type = "stdio";
                command = "${yt-dlp-mcp}/bin/yt-dlp-mcp";
              };
              reddit = {
                type = "stdio";
                command = "${reddit-mcp-buddy}/bin/reddit-mcp-buddy";
              };
            };
          };
        in
        {
          inherit yt-dlp-mcp reddit-mcp-buddy mcpConfig;
        };
    in
    {
      packages = forAllSystems (pkgs:
        let mcp = mkMcp pkgs; in {
          inherit (mcp) yt-dlp-mcp reddit-mcp-buddy;
        });

      checks = forAllSystems (pkgs:
        let mcp = mkMcp pkgs; in {
          mcp-servers = pkgs.runCommand "mcp-servers-check"
            { nativeBuildInputs = [ pkgs.jq ]; }
            ''
              set -euo pipefail
              test -x ${mcp.yt-dlp-mcp}/bin/yt-dlp-mcp
              test -x ${mcp.reddit-mcp-buddy}/bin/reddit-mcp-buddy
              jq -e --arg cmd "${mcp.yt-dlp-mcp}/bin/yt-dlp-mcp" \
                '.mcpServers["yt-dlp"].command == $cmd and .mcpServers["yt-dlp"].type == "stdio"' \
                ${mcp.mcpConfig} >/dev/null
              jq -e --arg cmd "${mcp.reddit-mcp-buddy}/bin/reddit-mcp-buddy" \
                '.mcpServers.reddit.command == $cmd and .mcpServers.reddit.type == "stdio"' \
                ${mcp.mcpConfig} >/dev/null
              if jq -e '
                  .. | strings? | select(test("CLIENT_SECRET|PASSWORD|TOKEN|API_KEY"; "i"))
                ' ${mcp.mcpConfig} >/dev/null; then
                echo "MCP config must not contain secrets" >&2
                exit 1
              fi
              touch $out
            '';
        });

      devShells = forAllSystems (pkgs:
        let
          python = pkgs.python311; # .python-version = 3.11, requires-python >= 3.11
          mcp = mkMcp pkgs;

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
              mcp.yt-dlp-mcp
              mcp.reddit-mcp-buddy
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
              mkdir -p .claude
              ${pkgs.jq}/bin/jq . ${mcp.mcpConfig} > .claude/.mcp.json
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
            export PATH="${pkgs.lib.makeBinPath [ python pkgs.uv pkgs.ffmpeg pkgs.imagemagick ]}:$PATH"
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
