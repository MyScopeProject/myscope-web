/**
 * Loads MPGS's Hosted Checkout SDK and launches the payment page.
 *
 * The script URL comes from the backend (sandbox/production point at
 * different gateway hosts) rather than being hardcoded here.
 *
 * Return handling: this SDK's `data-complete` / `data-cancel` / `data-error`
 * script attributes accept URLs — after payment the SDK does a full-page
 * redirect to them. So there are no JS callbacks to fire (showPaymentPage
 * navigates away). `data-complete` points at our API return handler (which
 * verifies via retrieveOrder); `data-cancel`/`data-error` go straight back
 * to the order/booking page.
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

function loadCheckoutScript(
  checkoutJsUrl: string,
  returnUrl: string,
  cancelUrl: string,
  errorUrl: string,
): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${checkoutJsUrl}"]`,
  );
  if (loadedScriptUrls.has(checkoutJsUrl) && window.Checkout && existing) {
    // Keep the redirect targets current for this attempt.
    existing.setAttribute('data-complete', returnUrl);
    existing.setAttribute('data-cancel', cancelUrl);
    existing.setAttribute('data-error', errorUrl);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = checkoutJsUrl;
    // The SDK reads these attributes when it executes; they must be present
    // before the script loads. As URLs, the SDK full-page-redirects to them.
    // Kept distinct (cancel vs error) so a buyer closing the payment page
    // can be told apart from something breaking on/before it.
    script.setAttribute('data-complete', returnUrl);
    script.setAttribute('data-cancel', cancelUrl);
    script.setAttribute('data-error', errorUrl);
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
  returnUrl,
  cancelUrl,
  errorUrl,
}: {
  sessionId: string;
  checkoutJsUrl: string;
  returnUrl: string;
  cancelUrl: string;
  errorUrl: string;
}): Promise<void> {
  await loadCheckoutScript(checkoutJsUrl, returnUrl, cancelUrl, errorUrl);

  if (!window.Checkout) {
    throw new Error('MPGS checkout.js did not initialize');
  }

  // Order/amount were attached to the session server-side (UPDATE_SESSION);
  // this SDK version accepts ONLY the session object in configure().
  window.Checkout.configure({ session: { id: sessionId } });
  window.Checkout.showPaymentPage();
}
