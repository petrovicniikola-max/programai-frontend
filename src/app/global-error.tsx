'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', background: '#fafafa' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Greška u aplikaciji</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Došlo je do greške pri učitavanju. Proverite da li backend radi na{' '}
            <code style={{ background: '#eee', padding: '0.2em 0.4em' }}>http://localhost:3001</code>.
          </p>
          {typeof window !== 'undefined' && (
            <details style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              <summary style={{ cursor: 'pointer' }}>Detalji greške</summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: '#f5f5f5',
                  overflow: 'auto',
                  borderRadius: '4px',
                }}
              >
                {error.message}
              </pre>
            </details>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1rem',
              background: '#18181b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Pokušaj ponovo
          </button>
        </div>
      </body>
    </html>
  );
}
