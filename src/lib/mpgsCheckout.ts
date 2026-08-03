/**
 * Loads MPGS's checkout.js and launches the Hosted Checkout overlay.
 *
 * The script URL comes from the backend (sandbox/production point at
 * different gateway hosts) rather than being hardcoded here.
 */

declare global {
  interface Window {
    Checkout?: {
      configure: (options: Record<string, unknown>) => void;
      showPaymentPage: () => void;
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
    // checkout.js reads these as global function NAMES at parse time, not
    // closures — that's why launchMpgsCheckout indirects through stable
    // window.__mpgsCancel/__mpgsError globals instead of passing the
    // per-call onCancel/onError directly.
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
  orderId,
  onCancel,
  onError,
}: {
  sessionId: string;
  checkoutJsUrl: string;
  // The SDK's pay-page call needs an order.id client-side (amount/currency/
  // returnUrl/merchant were all set server-side at session-create and are
  // explicitly forbidden in configure()). Verified against the v100 SDK.
  orderId: string;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
}): Promise<void> {
  // Registered globally so checkout.js's data-cancel/data-error attributes
  // (string function names, not closures) can reach these callbacks.
  (window as unknown as Record<string, unknown>).__mpgsCancel = () => onCancel?.();
  (window as unknown as Record<string, unknown>).__mpgsError = (error: unknown) => onError?.(error);

  await loadCheckoutScript(checkoutJsUrl);

  if (!window.Checkout) {
    throw new Error('MPGS checkout.js did not initialize');
  }

  window.Checkout.configure({ session: { id: sessionId }, order: { id: orderId } });
  window.Checkout.showPaymentPage();
}
