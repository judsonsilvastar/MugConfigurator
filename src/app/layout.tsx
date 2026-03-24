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
        <main>{children}</main>
      </body>
    </html>
  );
}