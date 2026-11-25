import { APP_NAME, APP_VERSION, escAttr, escText } from "../config.js";

const THEME_INIT_SCRIPT = `<script>(function(){var t=localStorage.getItem('glz_theme');if(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)t='dark';if(t)document.documentElement.setAttribute('data-theme',t);})();</script>`;

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

export function loginPage(error) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Sign in — ${APP_NAME}</title>
<meta name="description" content="Sign in to ${APP_NAME}">
${THEME_INIT_SCRIPT}
${FONT_LINKS}
<link rel="stylesheet" href="/assets/login.css?v=${APP_VERSION}">
</head>
<body>
<main class="auth-card">
  <div class="auth-head">
    <div class="auth-logo" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </div>
    <div>
      <h1>${APP_NAME}</h1>
      <p>File Storage &amp; Sharing</p>
    </div>
  </div>
  <form method="POST" action="/login">
    <div class="field">
      <label for="authPass">Password</label>
      <input type="password" id="authPass" name="password" class="input" autocomplete="current-password" autofocus required>
    </div>
    ${error ? `<div class="auth-err" role="alert">${escText(error)}</div>` : ""}
    <button type="submit" class="btn-submit">Sign in</button>
  </form>
  <div class="auth-foot">
    <span>${APP_NAME}</span>
    <span>v${APP_VERSION}</span>
  </div>
</main>
</body>
</html>`;
}

export function sharePasswordPage({ code, fileName, error }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Protected file — ${escText(fileName)}</title>
<meta name="description" content="Enter password to unlock ${escAttr(fileName)}">
${THEME_INIT_SCRIPT}
${FONT_LINKS}
<link rel="stylesheet" href="/assets/login.css?v=${APP_VERSION}">
</head>
<body>
<main class="auth-card">
  <div class="auth-head">
    <div class="auth-logo" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    </div>
    <div style="min-width:0">
      <h1 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escText(fileName)}</h1>
      <p>This shared file is password protected</p>
    </div>
  </div>
  <form method="POST" action="/${escAttr(code)}/unlock">
    <div class="field">
      <label for="sharePassInput">Access password</label>
      <input type="password" id="sharePassInput" name="password" class="input" autofocus required>
    </div>
    ${error ? `<div class="auth-err" role="alert">${escText(error)}</div>` : ""}
    <button type="submit" class="btn-submit">Unlock file</button>
  </form>
  <div class="auth-foot">
    <span>${APP_NAME}</span>
    <span>v${APP_VERSION}</span>
  </div>
</main>
</body>
</html>`;
}
