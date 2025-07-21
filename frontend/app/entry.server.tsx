import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { renderToString } from 'react-dom/server';
// Removed unused import

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  const body = renderToString(<RemixServer context={remixContext} url={request.url} />);

  responseHeaders.set('Content-Type', 'text/html');

  return new Response(`<!DOCTYPE html>${body}`, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
