// Client-side offer evaluator. Mirrors lib/offerEvaluator.js on the backend
// so the cart preview shows the same discount the server will charge at
// checkout. Keep the math in lockstep with the JS version — if behavior
// drifts, the buyer sees one price in the cart and a different one on
// the booking page.

export type OfferDiscountType = "free_tickets" | "percent" | "fixed"

export interface EventOffer {
  id: string
  ticket_type_id: string | null
  name: string
  min_quantity: number
  discount_type: OfferDiscountType
  discount_value: number | string
  is_active: boolean
}

export interface OfferCartLine {
  ticket_type_id: string | null
  unit_price: number
  quantity: number
}

export interface EvaluatedOffer {
  offer: EventOffer
  discount: number
  freedCount?: number
}

/**
 * Pick the best-applicable offer for a cart. "Best" = highest discount LKR
 * amount. Ties resolve to the lower min_quantity (easier to hit).
 */
export function pickBestOffer(
  offers: EventOffer[] | null | undefined,
  cartLines: OfferCartLine[] | null | undefined,
): EvaluatedOffer | null {
  if (!offers || offers.length === 0) return null
  if (!cartLines || cartLines.length === 0) return null

  let best: EvaluatedOffer | null = null
  for (const offer of offers) {
    if (!offer || offer.is_active === false) continue
    const evaluated = evaluateOne(offer, cartLines)
    if (!evaluated) continue
    if (
      best === null ||
      evaluated.discount > best.discount ||
      (evaluated.discount === best.discount && offer.min_quantity < best.offer.min_quantity)
    ) {
      best = evaluated
    }
  }
  return best
}

function evaluateOne(offer: EventOffer, cartLines: OfferCartLine[]): EvaluatedOffer | null {
  const scoped = offer.ticket_type_id
    ? cartLines.filter(l => l.ticket_type_id === offer.ticket_type_id)
    : cartLines

  const totalQty = scoped.reduce((s, l) => s + (Number(l.quantity) || 0), 0)
  const minQty = Number(offer.min_quantity) || 0
  if (totalQty < minQty || minQty <= 0) return null

  const value = Number(offer.discount_value) || 0
  if (value <= 0) return null

  const scopedSubtotal = scoped.reduce(
    (s, l) => s + (Number(l.unit_price) || 0) * (Number(l.quantity) || 0),
    0,
  )

  if (offer.discount_type === "percent") {
    const pct = Math.min(100, Math.max(0, value))
    const discount = +(scopedSubtotal * (pct / 100)).toFixed(2)
    if (discount <= 0) return null
    return { offer, discount }
  }

  if (offer.discount_type === "fixed") {
    const discount = +Math.min(value, scopedSubtotal).toFixed(2)
    if (discount <= 0) return null
    return { offer, discount }
  }

  if (offer.discount_type === "free_tickets") {
    const prices: number[] = []
    for (const l of scoped) {
      const q = Number(l.quantity) || 0
      const p = Number(l.unit_price) || 0
      for (let i = 0; i < q; i++) prices.push(p)
    }
    prices.sort((a, b) => a - b)
    const m = Math.min(Math.floor(value), prices.length)
    if (m <= 0) return null
    const discount = +prices.slice(0, m).reduce((s, p) => s + p, 0).toFixed(2)
    if (discount <= 0) return null
    return { offer, discount, freedCount: m }
  }

  return null
}
