// Workaround for an npm bug where transitive OPTIONAL native bindings are
// recorded in the lockfile but never extracted under workspaces, leaving an
// empty node_modules/@rolldown/binding-* dir. Vite 8's bundler (rolldown)
// needs the platform binding to build. An explicit `npm install <pkg>` does
// extract it correctly, so we self-heal here after every install.
//
// See: https://github.com/npm/cli/issues/4828
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

// Keep in sync with the `rolldown` version resolved for the admin workspace.
const ROLLDOWN_VERSION = '1.2.1';

const BINDINGS = {
  'darwin-arm64': '@rolldown/binding-darwin-arm64',
  'darwin-x64': '@rolldown/binding-darwin-x64',
  'linux-x64': '@rolldown/binding-linux-x64-gnu',
  'linux-arm64': '@rolldown/binding-linux-arm64-gnu',
  'win32-x64': '@rolldown/binding-win32-x64-msvc',
};

const key = `${process.platform}-${process.arch}`;
const pkg = BINDINGS[key];

if (!pkg) {
  console.warn(
    `[ensure-native-bindings] no rolldown binding mapped for ${key}; ` +
      `if the admin build fails, install the matching @rolldown/binding-* package.`,
  );
  process.exit(0);
}

try {
  require.resolve(pkg);
  // Already extracted — nothing to do.
} catch {
  console.log(
    `[ensure-native-bindings] ${pkg} missing — installing ${pkg}@${ROLLDOWN_VERSION} (npm optional-deps workaround)`,
  );
  execSync(`npm install ${pkg}@${ROLLDOWN_VERSION} --no-save --ignore-scripts`, {
    stdio: 'inherit',
  });
}
