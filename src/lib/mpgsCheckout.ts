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
  amount,
  currency,
  returnUrl,
  onCancel,
  onError,
}: {
  sessionId: string;
  checkoutJsUrl: string;
  // At the checkout.js SDK version this backend pairs with, order details
  // must be supplied here client-side rather than at session-creation time
  // — see the version note in myscope-api/lib/mpgs.js.
  orderId: string;
  amount: number | string;
  currency: string;
  returnUrl: string;
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

  window.Checkout.configure({
    session: { id: sessionId },
    order: { id: orderId, amount: Number(amount).toFixed(2), currency },
    // interaction.merchant.name is required server-side (shown on the
    // hosted payment page as who the buyer is paying) — MPGS 400s with
    // "Missing parameters" / field "interaction.merchant" without it.
    interaction: { operation: 'PURCHASE', returnUrl, merchant: { name: 'My Scope (Pvt) Ltd' } },
  });
  window.Checkout.showPaymentPage();
}
