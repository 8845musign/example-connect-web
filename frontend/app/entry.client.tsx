import { HydratedRouter } from 'react-router/dom';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

startTransition(() => {
  hydrateRoot(
    document.documentElement,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
