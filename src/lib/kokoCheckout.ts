/**
 * Launches Koko (BNPL) checkout.
 *
 * Unlike MPGS's SDK overlay, Koko is a redirect flow: the backend
 * (/api/payments/initialize-event-koko) returns a signed field set and the
 * action URL, and the BROWSER form-POSTs it to Koko's hosted page. Koko reads
 * application/x-www-form-urlencoded, which is exactly what a native form POST
 * sends — so we build a hidden form and submit it, causing a full-page
 * navigation to Koko.
 *
 * Nothing sensitive is decided client-side: the signature was computed
 * server-side over the exact fields below, and the payment verdict later comes
 * from Koko's signed server-to-server webhook / orderView — never from this
 * redirect. Success/cancel land back on our API's koko/return|cancel routes,
 * which bounce the browser to the booking page with the usual ?payment= flag.
 */
export function launchKokoCheckout({
  actionUrl,
  fields,
}: {
  actionUrl: string;
  fields: Record<string, string>;
}): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value ?? '';
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
