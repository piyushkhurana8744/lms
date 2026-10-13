import './globals.css';
import { Providers } from '@/components/providers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DIDM — Enterprise Digital Learning & Education Management Platform',
  description: 'Official DIDM Learning Management System. Advanced multi-tenant SaaS platform empowering digital education, courses, live classrooms, and certification.',
  icons: {
    icon: '/didmfavicon.png',
    shortcut: '/didmfavicon.png',
    apple: '/didmfavicon.png',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/didmfavicon.png" sizes="any" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('didm_theme_preference');
                  var theme;
                  if (saved === 'light') {
                    theme = 'light';
                  } else if (saved === 'dark') {
                    theme = 'dark';
                  } else {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.classList.add(theme);
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="font-sans antialiased selection:bg-[#BE1E2E] selection:text-white min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
