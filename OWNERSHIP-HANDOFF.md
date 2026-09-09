# Ownership & Secrets — Handoff Checklist

**Goal:** move The High Life website off *personal* accounts and onto *business-owned*
ones, and rotate any keys that have been shared around. Work top to bottom. You can do
this in stages — but do **Section A (rotate keys)** first.

> Rule of thumb: **the business (Hydro Phonics, LLC) should OWN everything; you should be an
> ADMIN on it.** That way access survives any change in staff or vendors, and nothing is
> hostage to one personal login.

---

## A. Rotate the keys (do this first) 🔴

Any key that has been typed into a chat, email, screenshot, or text should be treated as
**burned** and replaced. It doesn't matter that it isn't in the website's code (it isn't —
that's confirmed) — once a secret leaves a secure place, you rotate it.

- [ ] **Proteus read key** (menu) — regenerate in Proteus → Settings/API.
- [ ] **The 4 test keys** created while we were experimenting — delete or regenerate them.
- [ ] After regenerating, update the values in **both** places (see Section E): your local
      `.env.local` and the **Netlify environment variables**, then redeploy.

**Going forward:** never paste a key into chat, email, or a screenshot. Store keys in a
password manager (Section D). Treat them like the safe combination.

---

## B. Create the business identity (everything hangs off this)

- [ ] **Business email on your domain** — e.g. `admin@thehighlifeny.com` (via Google
      Workspace or your domain host's email). This becomes the **owner login** for every
      service below. Do this before re-parenting the accounts, because they'll all point
      back to it.
- [ ] Turn on **2-factor authentication (2FA)** for this email immediately.

---

## C. Move each account to the business

### GitHub (where the code lives)
Currently under a personal handle (`elijahthomas9898-web/thehighlife`).
- [ ] Create a **GitHub Organization** owned by the business email (e.g. `the-high-life-ny`).
- [ ] **Transfer** the `thehighlife` repository into that organization
      (repo → Settings → *Danger Zone* → Transfer ownership).
- [ ] Add yourself to the org as an **Owner/Admin**.
- [ ] Turn on **2FA** for the org.

### Netlify (where the site is hosted)
Currently (likely) a personal Netlify login. There are **two sites**: the main website and
the signage site.
- [ ] Create a **Netlify team** under the business email.
- [ ] **Transfer both sites** to that team (Site → Site configuration → Transfer), or add
      the business email as a team **Owner**.
- [ ] Re-connect the sites to the **new GitHub org** repo so deploys keep working.
- [ ] Re-enter the **environment variables** on the business team (Section E).

### Domain (thehighlifeny.com)
- [ ] Confirm the domain **registrant/owner is the business**, and the contact email is the
      new business email — not a personal Gmail.
- [ ] Turn on **2FA** at the domain registrar and enable **auto-renew** (so the domain can't
      lapse).

### Proteus (the POS)
- [ ] Provision **dedicated API keys owned at the business/app level**, ideally created from
      the **license holder's** Proteus account — not your personal marketing-manager access.
- [ ] A **read** key is all the website needs. It only fetches the menu; it never writes
      to Proteus. Ordering runs inside Proteus's own JSCart checkout, which authenticates
      on their side — so do **not** give the site a write key.

---

## D. Access model (least privilege)

- [ ] Put every login and key into a **business password manager** (e.g. 1Password /
      Bitwarden) owned by the business email.
- [ ] Owner accounts = the **license holder / business**. You and any staff get **admin or
      member** roles as needed — not ownership of the personal account.
- [ ] **2FA everywhere:** email, GitHub, Netlify, Proteus, domain registrar, password
      manager.
- [ ] Keep a short list of "who has access to what" so it can be revoked cleanly if someone
      leaves.

---

## E. Where secrets live (and nowhere else)

Two places only:

1. **`.env.local`** on a developer's machine — for local testing. It is **git-ignored**
   (confirmed) and must never be committed.
2. **Netlify → Site configuration → Environment variables** — for the live site.

The website reads these names (values live only in the two places above):

| Variable | What it is | Secret? |
|---|---|---|
| `PROTEUS_CLIENT_NAME` | Your Proteus account name (`highlife`) | no |
| `PROTEUS_WEBSERVICE_PASS` | Proteus **read** key (menu) | 🔒 yes |
| `PROTEUS_APP_NAME` | Your website integration's AppName, sent with menu requests to identify this site to Proteus. Find it in Proteus → API Keys / Integrations. | no |
| `SITE_PUBLIC` | `true` lets search engines index the live site | no |

> Anything starting with `NEXT_PUBLIC_` is visible in the browser **by design** — so a real
> secret must **never** be given that prefix. The Proteus keys correctly are **not** public.

---

## F. Before you flip the site public

- [ ] Keys rotated (Section A) and re-entered on the business Netlify team.
- [ ] `SITE_PUBLIC=true` set **only when you're ready** for Google to see it (until then the
      site is intentionally hidden from search).
- [ ] **Privacy Policy** and **Terms** pages live and linked in the footer. ✅ (added)
- [ ] 21+ age gate and the yellow compliance warning present. ✅ (already there)
- [ ] 2FA confirmed on email, GitHub, Netlify, Proteus, and the domain registrar.
- [ ] The legal pages reviewed by a cannabis-savvy attorney before launch.

---

*This checklist contains no actual keys or passwords — it's the process only. Keep the real
values in your password manager.*
