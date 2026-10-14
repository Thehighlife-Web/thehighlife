/**
 * The ways this shop can be ordered from, read from Proteus rather than typed
 * out here.
 *
 * ⚠️ WHY IT'S FETCHED. The store turns pickup / curbside / delivery on and off
 * in Proteus, and the kiosk, the checkout and the cart widget all follow that
 * setting. If this list were hard-coded, the moment delivery was switched off
 * the pop-up would carry on offering it and the customer would pick a way to get
 * their order that the shop can't honour. So it comes from the same `locations`
 * call JSCart itself uses.
 *
 * The `token` values are JSCart's own ship-type tokens, exactly as its
 * SHOPTYPE_LABELS table spells them. They are what gets stored for the widget
 * and posted to checkout as `shopType`, so they cannot be prettified.
 */

const LOCATIONS_URL =
  "https://cart.proteus420.com/highlife/api_cart_v2.cfm?action=locations";

export type OrderType = {
  /** JSCart's ship-type token — do not change the spelling. */
  token: "pickup" | "pickup-curbside" | "delivery";
  label: string;
  blurb: string;
};

const ALL: (OrderType & { flag: string })[] = [
  {
    token: "pickup",
    label: "Pick Up",
    blurb: "Order ahead and collect at the counter",
    flag: "pickupAvailable",
  },
  {
    token: "pickup-curbside",
    label: "Curbside",
    blurb: "We bring it out to your car",
    flag: "curbsideAvailable",
  },
  {
    token: "delivery",
    label: "Delivery",
    blurb: "Scheduled delivery to your door",
    flag: "deliveryAvailable",
  },
];

/** Pickup is the safe answer: this shop has a counter, whatever else is off. */
const FALLBACK: OrderType[] = [
  { token: ALL[0].token, label: ALL[0].label, blurb: ALL[0].blurb },
];

type LocationRow = Record<string, unknown>;

/**
 * Reads the flags for location 1. Returns pickup only if anything goes wrong —
 * a pop-up that offers too little is a nuisance, one that offers a service the
 * shop isn't running is a broken order.
 *
 * ⚠️ Their response shape has already changed once: it used to be a bare array
 * and is now { locations: [...] }. Both are handled, and the flags are read
 * case-insensitively because the API also answers in SHOUTING CASE elsewhere.
 */
export async function getOrderTypes(): Promise<OrderType[]> {
  try {
    const res = await fetch(LOCATIONS_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    const rows: LocationRow[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.locations)
        ? data.locations
        : [];
    const loc = rows[0];
    if (!loc) return FALLBACK;

    const on = (flag: string) => {
      const key = Object.keys(loc).find((k) => k.toLowerCase() === flag.toLowerCase());
      return key ? loc[key] === true || loc[key] === "true" : false;
    };

    const offered = ALL.filter((t) => on(t.flag)).map(({ token, label, blurb }) => ({
      token,
      label,
      blurb,
    }));
    return offered.length ? offered : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
