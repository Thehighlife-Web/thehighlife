import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Baloo_2 } from "next/font/google";
import "./globals.css";
import AgeGate from "./components/AgeGate";
import PromoPopup from "./components/PromoPopup";
import WarnBand from "./components/WarnBand";
import { InlineScript } from "./components/InlineScript";

/**
 * The groovy display face. Self-hosted by Next at build time, so it renders
 * BYTE-IDENTICALLY on the kiosk, phones and desktop — no more per-device
 * fallback to Arial Rounded / SF Rounded / Roboto. Baloo 2 is the closest
 * free match to the rounded bold look, and pairs with the bubble logo.
 */
const groovy = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-groovy",
  display: "swap",
});

export const metadata: Metadata = {
  // Canonical domain: makes page/OG/canonical URLs absolute and points them at
  // the real domain (not the *.netlify.app address), so Google attributes all
  // ranking to thehighlifeny.com.
  metadataBase: new URL("https://thehighlifeny.com"),
  title: "The High Life Dispensary | West Babylon, NY",
  description:
    "Licensed New York adult-use dispensary in West Babylon. The brands you love, tested and shelf-ready, with fresh deals every week. Must be 21+.",
  // Proves ownership of the domain to Google Search Console, which is what lets us
  // submit the sitemap and request indexing instead of waiting to be crawled.
  verification: { google: "P8e49ANLDTQb-NkaXCUN6tvy3x6wDKkOl55XqzX2nvg" },
};

/**
 * Runs synchronously while the browser parses the HTML — BEFORE first paint.
 * Two jobs, both of which depend on client-only state:
 *   1. data-age="ok"  — hides the 21+ gate for visitors who already confirmed,
 *                       with no flash of the gate (see Next.js "Preventing Flash
 *                       Before Hydration"). Absent = gate shows + scroll locked,
 *                       so it fails CLOSED.
 *   2. data-today="N" — highlights today's row in the hours table, in the STORE's
 *                       timezone (America/New_York), not the visitor's.
 * Both are plain attributes driving CSS, so React never has to reconcile them.
 */
const BOOT_SCRIPT = `(function(){
// Password reset. Proteus emails a link to the site ROOT as
// "?action=newpass&u=UUID", but JSCart only reads those params where the widget
// is mounted — so on the homepage nothing handled them and the visitor just
// landed on the store, unable to set a new password. Forward to /menu with the
// query intact and JSCart takes it from there (it validates the uuid and opens
// the Set New Password panel). Runs first and pre-paint, so no homepage flash.
//
// Skip the redirect wherever the widget ALREADY exists (/menu, /deals, /kiosk):
// it handles the params in place, and on /kiosk a redirect would be actively
// harmful — leaving /kiosk drops the tablet out of kiosk mode.
try{var _p=new URLSearchParams(location.search),_pn=location.pathname;
if(_p.get("action")==="newpass"&&_p.get("u")&&
_pn.indexOf("/menu")!==0&&_pn.indexOf("/deals")!==0&&_pn.indexOf("/kiosk")!==0){
location.replace("/menu"+location.search+location.hash);return}}catch(e){}
// Shared-tablet privacy. JSCart's kiosk reset clears the cart and signs the
// customer out (kioskFullReset -> clearAuthToken + reload), but it does NOT clear
// two things it persists per DEVICE rather than per customer:
//   proteus_recent_<client>   - recently viewed products
//   proteus_wishlist_<client> - saved favourites
// On a tablet on the shop floor that means the next customer sees what the last
// one browsed and saved. Wipe them on every /kiosk load — the kiosk reloads after
// each reset and each order, so every customer starts clean. Done here, before the
// widget script loads, because the widget reads them into memory at init.
// Auth and cart are deliberately left alone: the widget already handles those, and
// clearing auth here would sign a shopper out when they return from checkout.
try{if(location.pathname.indexOf("/kiosk")===0){
localStorage.removeItem("proteus_recent_highlife");
localStorage.removeItem("proteus_wishlist_highlife")}}catch(e){}
// Skip JSCart’s KIOSK SETUP dialog. Its check is "if (!kioskSettings) showKioskSetup()"
// and it runs BEFORE the lockSelections branch, so a tablet whose storage has been
// cleared greets the next CUSTOMER with a staff form asking for shop type, timeout
// and an exit PIN. Seeding the key the widget reads sends it straight to the shop.
//
// Only when absent, so a device someone configured by hand (and its PIN) is left alone.
// Deliberately minimal: no locationId (one location, the widget picks it), and NO
// timeout — kioskTimeoutMs() is "kioskSettings.timeout || config.kioskTimeout", so
// omitting it keeps the kioskTimeout prop in ProteusShop as the single source.
try{if(location.pathname.indexOf("/kiosk")===0){
var _kk="proteus_kiosk_highlife";
if(!localStorage.getItem(_kk)){
localStorage.setItem(_kk,JSON.stringify({shopType:"pickup",pin:""}))}}}catch(e){}
// Don't offer the customer the EXIT KIOSK prompt on the way back from checkout.
//
// checkout() stamps kiosk=1 onto the return URL it hands Proteus:
//     if (!/[?&]kiosk=/.test(base)) kioskReturnUrl = base + '?kiosk=1'
// and the bootstrap reads that same param as a STAFF request to leave:
//     else if (kioskParamPresent && wasKioskEngaged && !urlParams.has('orderComplete'))
//         showKioskExitPrompt();
// Those two cannot tell each other apart. Finish an order and orderComplete
// saves you; tap "go back" instead and the widget hands the customer a dialog
// whose Exit button ends kiosk mode — with no PIN, because the check is
// "if (pin && val !== pin)" and the PIN we seed above is empty. So a customer
// changing their mind at checkout could drop the tablet out of kiosk mode.
//
// Dropping the param costs nothing: isKioskRequested() falls back to
// config.kiosk === true, which /kiosk passes, so kiosk mode stays on. The
// post-order path keeps working too — kioskJustOrdered keys off that same
// kioskRequested, not off the param. The widget already cleans this param out
// of the address bar itself and leans on sessionStorage to remember.
//
// staff=1 keeps a deliberate way in: /kiosk?kiosk=1&staff=1 still shows the
// prompt. Customers have no way to reach that; the return URL never carries it.
try{if(location.pathname.indexOf("/kiosk")===0){
var _u=new URL(location.href);
if(_u.searchParams.has("kiosk")&&_u.searchParams.get("staff")!=="1"){
_u.searchParams.delete("kiosk");
var _qs=_u.searchParams.toString();
history.replaceState(null,"",_u.pathname+(_qs?"?"+_qs:"")+_u.hash)}}}catch(e){}
// In-store signage (/signage) is inside a 21+-verified space — bypass the gate
// before first paint so a TV never shows the "Are you 21?" prompt.
// /kiosk is the in-store tablet: ID is checked at the door, so the gate is wrong
// there for the same reason it's wrong on signage. CSS in globals.css backs this
// up (.kiosk-page) so the kiosk works even if this script never runs.
try{if(location.pathname.indexOf("/signage")===0||location.pathname.indexOf("/kiosk")===0){document.documentElement.setAttribute("data-age","ok")}}catch(e){}
try{if(localStorage.getItem("hl_age_verified")==="1"){document.documentElement.setAttribute("data-age","ok")}}catch(e){}
try{if(document.cookie.indexOf("hl_age_verified=1")!==-1){document.documentElement.setAttribute("data-age","ok")}}catch(e){}
// Storage-independent safety net for in-app browsers (Instagram/TikTok/FB) that
// wipe localStorage AND cookies between pages: if this page was reached FROM a
// page on our own site, the visitor already cleared the gate (it's a full-screen
// blocker, so internal navigation is impossible before accepting). Only a first
// arrival from outside / a direct hit still shows the gate.
try{if(document.referrer&&document.referrer.indexOf(location.origin+"/")===0){document.documentElement.setAttribute("data-age","ok")}}catch(e){}
try{var d=new Date().toLocaleString("en-US",{timeZone:"America/New_York",weekday:"short"}),
m={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
if(m[d]!==undefined){document.documentElement.setAttribute("data-today",String(m[d]))}}catch(e){}
})();`;

/**
 * ⚠️ The age gate's verified flag is rendered SERVER-SIDE, on purpose.
 *
 * It used to rely solely on the boot script setting data-age="ok" on <html>.
 * That broke on iOS Safari: a diagnostic on a real iPhone reported the flag missing
 * even though the cookie, localStorage AND referrer all survived — React drops
 * DOM attributes it doesn't own when it re-renders the tree at startup, so the
 * gate reappeared on every page load and every refresh (mobile only).
 *
 * Reading the cookie here makes data-age a real React prop: it's in the HTML on
 * the very first byte (no flash, no JS required) and survives any re-render.
 * Cost: routes render dynamically instead of static. Worth it — a gate that
 * re-prompts every page is far more expensive than a server render.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const verified = (await cookies()).get("hl_age_verified")?.value === "1";

  return (
    <html
      lang="en"
      className={groovy.variable}
      data-age={verified ? "ok" : undefined}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={BOOT_SCRIPT} />
        {/*
          Warm up the shop's hosts before anything asks for them.

          ProteusShop creates the JSCart <script> inside a useEffect, so the browser
          doesn't even learn cart.proteus420.com exists until our JS has downloaded,
          parsed and hydrated — and only THEN does it start a DNS lookup and TLS
          handshake for a ~570KB script. That's a long serial chain on a phone.

          preconnect does the DNS + TCP + TLS up front, in parallel with our own
          bundle, so the moment the effect runs the connection is already open.
          Costs a few bytes of HTML and no requests.

          The other three are hosts JSCart itself reaches for once it boots:
          Font Awesome (~100KB) and the two image hosts serving product artwork.
        */}
        {/* Both hosts are in play: the widget script and checkout come from our own
            cart subdomain, while the product/cart/auth APIs still resolve on
            proteus420 (see the baseUrl note in ProteusShop). */}
        <link rel="preconnect" href="https://cart.thehighlifeny.com" />
        <link rel="preconnect" href="https://cart.proteus420.com" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="" />
        <link rel="preconnect" href="https://proteusimages.s3.us-west-1.amazonaws.com" />
        <link rel="dns-prefetch" href="https://d3ilo4wq1uvg39.cloudfront.net" />
      </head>
      <body>
        {/* Gate is always in the DOM; CSS decides whether it's visible. */}
        <AgeGate />
        {/* Promo pop-up — shows after the gate, once a day, and stops on its own. */}
        <PromoPopup />
        {/* The real cart/checkout is Proteus's JSCart, embedded on /menu. */}
        {children}
        <WarnBand />
      </body>
    </html>
  );
}
