// Browser extensions (Enpass and other password managers, ad blockers, etc.)
// inject scripts that run in chrome-extension:// frames and throw. Next's dev
// overlay forwards every window error / unhandledRejection to the terminal,
// drowning real errors in noise like "Cannot read properties of undefined
// (reading 'M_ID')" from eppiocemhmnlbhjplcgkofciiegomcon (Enpass).
//
// Swallow anything whose stack points only at an extension. Our own code is
// never in a chrome-extension:// URL, so this can't hide a real bug.

function isExtensionNoise(stack: string | undefined, source: string | undefined): boolean {
  const s = `${stack ?? ''} ${source ?? ''}`;
  return /(chrome|moz|safari-web)-extension:\/\//.test(s) && !/\/_next\//.test(s);
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (e) => {
      if (isExtensionNoise(e.error?.stack, e.filename)) e.stopImmediatePropagation();
    },
    true,
  );

  window.addEventListener(
    'unhandledrejection',
    (e) => {
      const reason = e.reason as { stack?: string } | undefined;
      if (isExtensionNoise(reason?.stack, undefined)) e.stopImmediatePropagation();
    },
    true,
  );
}
