import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Mug Configurator',
  description: 'Design your own custom mug',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header>
          <h1>Mug Configurator</h1>
        </header>
        <main>{children}</main>
        <footer>
          <p>&copy; {new Date().getFullYear()} Mug Configurator</p>
        </footer>
      </body>
    </html>
  );
}