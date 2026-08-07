# Deploying Clockspian

The local git repo is already set up and committed. What's left is pushing it to GitHub
and pointing Vercel at it.

These steps are click-by-click through the web UIs because this machine has no `gh` or
`vercel` CLI installed (no Homebrew or Node either). If you'd rather automate it later,
see [Automating this](#automating-this) at the bottom.

## 1. Create the GitHub repo

1. Go to <https://github.com/new>.
2. **Repository name:** `clockspian` (anything works — it just has to match step 2).
3. Leave it **Public** or **Private**, either is fine; Vercel handles both.
4. **Do not** tick "Add a README", "Add .gitignore", or "Choose a license". The repo
   already has these, and an initialised remote will cause a push conflict.
5. Click **Create repository**.

## 2. Push

GitHub will show you a "push an existing repository" snippet. It's this, with your own
username:

```bash
git -C ~/Claude/Code/ClockspianApp remote add origin https://github.com/YOUR-USERNAME/clockspian.git
```

```bash
git -C ~/Claude/Code/ClockspianApp push -u origin main
```

If it asks for a password, GitHub wants a **personal access token**, not your account
password — generate one at <https://github.com/settings/tokens>. Or install GitHub
Desktop and let it handle auth.

## 3. Import into Vercel

1. Go to <https://vercel.com/new>.
2. Sign in with GitHub if you haven't; authorise Vercel to see your repos.
3. Find `clockspian` in the list and click **Import**.
4. On the configure screen, leave **everything at its defaults**:
   - Framework Preset: **Other**
   - Build Command: *empty*
   - Output Directory: *empty*
   - Install Command: *empty*

   This is a plain static site — there is nothing to build, and filling any of these in
   will make the deploy fail.
5. Click **Deploy**.

It'll take about twenty seconds. You'll get a URL like `clockspian-xyz.vercel.app`.

## 4. Set it as the laptop's home page

Open the Vercel URL on the work laptop and set it as the home page or new-tab page. In
Chrome: **Settings → On startup → Open a specific page**, paste the URL.

For a fully clean screen with no browser chrome, open it and press **F11** (Windows) for
fullscreen. Chrome can also launch straight into it:

```bash
chrome.exe --app=https://YOUR-URL.vercel.app --start-fullscreen
```

Nothing needs installing on the laptop, and there's no login.

## Updating it

Vercel redeploys automatically on every push to `main`:

```bash
git -C ~/Claude/Code/ClockspianApp add -A && git -C ~/Claude/Code/ClockspianApp commit -m "your message" && git -C ~/Claude/Code/ClockspianApp push
```

## Automating this

To drive the whole pipeline from the terminal instead, you'd need, in order:

1. **Homebrew** — <https://brew.sh>
2. `brew install gh` and `gh auth login` — then `gh repo create` replaces step 1–2
3. `brew install node`, `npm i -g vercel`, `vercel login` — then `vercel --prod`
   replaces step 3

None of these are installed right now, which is the only reason the above is manual.
