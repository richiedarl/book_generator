/**
 * Google Drive OAuth Callback
 *
 * Receives the OAuth code from Google's redirect, exchanges it for tokens,
 * and returns a small HTML page that closes the popup and notifies the
 * parent window via window.opener.postMessage.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, createFolder } from "@/lib/google-drive";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Build the HTML page that will be served in the popup.
  // It uses postMessage to communicate with the opener window.
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Google Drive Authorization</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; text-align: center; }
    .success { color: #2e7d32; }
    .error { color: #c62828; }
  </style>
</head>
<body>
  <div id="status">Processing authorization...</div>
  <script>
    window.addEventListener('load', function() {
      const statusDiv = document.getElementById('status');
      const opener = window.opener;

      if (!opener) {
        statusDiv.innerHTML = '<div class="error">No opener window found. Please close this tab and try again.</div>';
        return;
      }

      // Send the message back to the parent
      if (window.location.search.includes('code=')) {
        // Extract params from the search string
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        opener.postMessage({
          type: 'DRIVE_AUTH_' + (error ? 'FAIL' : 'SUCCESS'),
          code: code,
          error: error,
          tokens: ${JSON.stringify(code ? 'pending' : null)}
        }, '*');

        statusDiv.innerHTML = '<div class="success">Authorization successful! You can close this window.</div>';
        setTimeout(function() { window.close(); }, 2000);
      } else if (window.location.search.includes('error=')) {
        statusDiv.innerHTML = '<div class="error">Authorization failed. Please try again.</div>';
      }
    });
  </script>
</body>
</html>
  `;

  if (error) {
    return new Response(
      html.replace(
        "Processing authorization...",
        `<div class="error">Authorization error: ${error}</div>`
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  if (!code) {
    return NextResponse.json({ error: "No authorization code provided" }, { status: 400 });
  }

  try {
    const tokens = await getTokensFromCode(code);

    // Return HTML page that sends tokens back to opener via postMessage
    const htmlWithTokens = `
<!DOCTYPE html>
<html>
<head>
  <title>Google Drive Authorization</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; text-align: center; }
    .success { color: #2e7d32; }
    .error { color: #c62828; }
  </style>
</head>
<body>
  <div class="success">Authorization successful!</div>
  <script>
    window.addEventListener('load', function() {
      const opener = window.opener;
      if (opener) {
        opener.postMessage({
          type: 'DRIVE_AUTH_SUCCESS',
          accessToken: ${JSON.stringify(tokens.access_token)},
          refreshToken: ${JSON.stringify(tokens.refresh_token || "")},
          expiresAt: ${JSON.stringify(tokens.expiry_date || Date.now() + 3600000)},
        }, '*');
      }
      setTimeout(function() { window.close(); }, 1500);
    });
  </script>
</body>
</html>
    `;

    return new Response(htmlWithTokens, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return new Response(
      html.replace("Processing authorization...", `<div class="error">Error: ${err.message}</div>`),
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}
