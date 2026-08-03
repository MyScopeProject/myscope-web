/**
 * Loads MPGS's Hosted Checkout SDK and launches the payment page.
 *
 * The script URL comes from the backend (sandbox/production point at
 * different gateway hosts) rather than being hardcoded here.
 *
 * Return handling: per Seylan's own docs, showPaymentPage() does a full-page
 * redirect to MPGS's hosted page, and MPGS redirects back to
 * interaction.returnUrl (set server-side at session-create) regardless of
 * outcome — success, cancel, or decline are ALL routed there; our API's
 * return handler tells them apart via retrieveOrder(). There is no
 * client-side "complete" callback for this mode.
 *
 * The data-error / data-cancel script attributes are JS function NAMES
 * (not URLs) for problems that happen HERE, before the browser ever leaves
 * for MPGS (e.g. a bad/expired session) — we're still on our own page when
 * they fire, so they just surface an inline error via onCancel/onError.
 */

declare global {
  interface Window {
    Checkout?: {
      configure: (options: Record<string, unknown>) => Promise<void>;
      showPaymentPage: () => Promise<void>;
    };
  }
}

const loadedScriptUrls = new Set<string>();

function loadCheckoutScript(checkoutJsUrl: string): Promise<void> {
  if (loadedScriptUrls.has(checkoutJsUrl) && window.Checkout) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = checkoutJsUrl;
    // The SDK reads these as global function NAMES at parse time, not
    // closures — hence the indirection through stable window.__mpgs* globals
    // whose bodies get reassigned per call in launchMpgsCheckout().
    script.setAttribute('data-error', '__mpgsError');
    script.setAttribute('data-cancel', '__mpgsCancel');
    script.onload = () => {
      loadedScriptUrls.add(checkoutJsUrl);
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load MPGS checkout.js'));
    document.body.appendChild(script);
  });
}

export async function launchMpgsCheckout({
  sessionId,
  checkoutJsUrl,
  onCancel,
  onError,
}: {
  sessionId: string;
  checkoutJsUrl: string;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
}): Promise<void> {
  (window as unknown as Record<string, unknown>).__mpgsCancel = () => onCancel?.();
  (window as unknown as Record<string, unknown>).__mpgsError = (error: unknown) => onError?.(error);

  await loadCheckoutScript(checkoutJsUrl);

  if (!window.Checkout) {
    throw new Error('MPGS checkout.js did not initialize');
  }

  // Order/amount/returnUrl/merchant name were all set server-side at
  // session-create (INITIATE_CHECKOUT); this SDK version (v67+) accepts
  // ONLY the session object here. Must await configure() before
  // showPaymentPage() — both are async (an internal iframe handshake).
  await window.Checkout.configure({ session: { id: sessionId } });
  await window.Checkout.showPaymentPage();
}
