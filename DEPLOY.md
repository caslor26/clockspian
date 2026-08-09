# Deploying Clockspian

Live at <https://clockspian.vercel.app>.

Source lives at <https://github.com/caslor26/clockspian>. The Vercel project is linked to
that repo, so **every push to `main` redeploys automatically** — there is no manual
deploy step in normal use.

## Updating it

Edit, commit, push. That's the whole loop:

```bash
git -C ~/Claude/Code/ClockspianApp add -A && git -C ~/Claude/Code/ClockspianApp commit -m "your message" && git -C ~/Claude/Code/ClockspianApp push
```

Vercel picks it up within a few seconds. Watch it land with:

```bash
cd ~/Claude/Code/ClockspianApp && vercel list clockspian
```

## Deploying by hand

Only needed if you want to push a build that isn't committed, or if the git integration
is disconnected:

```bash
cd ~/Claude/Code/ClockspianApp && vercel deploy --prod --yes
```

**The `cd` is not optional.** Run `vercel deploy` from your home directory and it will
offer to deploy `~` — your entire home folder, keys and documents included — as a
website. It does ask first:

```
? You are deploying your home directory. Do you want to continue?
```

The answer is always **no**. Then `cd` into the project and run it again. The same trap
applies to any directory that isn't this one: without the `.vercel/project.json` link
found here, the CLI creates a brand-new unrelated project instead of updating this one.

## Project settings

This is a plain static site — HTML, CSS, and ES modules, no build step, no dependencies,
no environment variables. In Vercel's project settings that means:

- Framework Preset: **Other**
- Build Command, Output Directory, Install Command: **all empty**

Filling any of them in will fail the deploy. There is nothing to build.

## Setting up a fresh machine

The toolchain, in dependency order. Steps 1–3 are one-time per machine; step 4 is
one-time per checkout.

1. **Homebrew** — <https://brew.sh>

2. **GitHub CLI**, for authentication rather than for `gh` itself — it's what lets `git
   push` work over HTTPS without a personal access token:

   ```bash
   brew install gh && gh auth login && gh auth setup-git
   ```

   `gh auth login` wants: GitHub.com → HTTPS → yes to authenticating git → login with a
   web browser. `gh auth setup-git` is the easily-missed one; without it `git push`
   prompts for a password that GitHub no longer accepts.

3. **Vercel CLI.** Install it directly rather than via `npm i -g vercel` — that route
   needs Node installed system-wide for no other reason:

   ```bash
   brew install vercel-cli && vercel login
   ```

4. **Link the checkout to the project:**

   ```bash
   cd ~/Claude/Code/ClockspianApp && vercel link --yes --project clockspian
   ```

   This writes `.vercel/project.json` (gitignored) and, if the account can see the
   GitHub repo, wires up push-to-deploy on its own. It also drops a `.env.local`
   holding a short-lived `VERCEL_OIDC_TOKEN` and adds `.env*` to `.gitignore` — nothing
   to configure, but don't commit it.

Keep the GitHub and Vercel accounts on the same identity (`caslor26`). If they differ,
Vercel can't see the repo, the link step silently skips the git connection, and pushes
stop triggering deploys.

## On the work laptop

Open the URL and set it as the home page or new-tab page — Chrome:
**Settings → On startup → Open a specific page**. `F11` gives fullscreen.

For a clean window with no browser chrome at all:

```bash
chrome.exe --app=https://clockspian.vercel.app --start-fullscreen
```

Nothing to install on that end, and no login.
