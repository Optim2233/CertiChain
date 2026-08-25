// Guards the non-blocking auth gate in src/shared/hooks/useRequireAuth.tsx.
//
// The perf fix there was to stop returning null while GET /me is in flight, so
// portal pages mount immediately and their queries run in parallel with the
// auth check. That is easy to silently undo (a stray `return null`, or
// re-adding an isAuthenticated guard), and undoing it costs every portal page
// a serial round-trip again. Static assertions rather than a render test: no
// test framework is configured here, and the properties worth locking are
// visible in the source.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import path from 'node:path';

const src = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'hooks', 'useRequireAuth.tsx'),
  'utf8',
);

// The gate must never render a blank while waiting on /me.
assert.ok(!/return null/.test(src), 'RequireAuth must not return null - that reintroduces the auth waterfall');

// Children must be rendered unconditionally at the end of the component.
assert.ok(/return children;?\s*\n?\}/.test(src), 'RequireAuth must fall through to `return children`');

// The wrong-role guard is still the one legitimate block, and must survive.
assert.ok(/wrongRole/.test(src), 'wrongRole guard is missing');
assert.ok(/doesn&apos;t have access to this portal/.test(src), 'wrong-role message is missing');

// The expired/revoked-session redirect must still fire outside dev bypass.
assert.ok(/router\.replace\(/.test(src), 'login redirect on isError is missing');
assert.ok(/redirect=\$\{encodeURIComponent\(pathname\)\}/.test(src), 'redirect must preserve the current path');
assert.ok(/devBypass/.test(src), 'dev bypass must still gate the redirect');

console.log('useRequireAuth: all checks passed');
