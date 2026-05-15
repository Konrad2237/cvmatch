import './globals.css';

export const metadata = {
  title: 'CVMatch',
  description: 'Porównaj CV z ogłoszeniem i dostań konkretny feedback',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="bg-gray-50 text-gray-900">
        {/* TODO: add navbar/header if needed */}
        {children}
      </body>
    </html>
  );
}
