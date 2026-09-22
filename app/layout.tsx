import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VocabSync • English Vocabulary Flashcards",
  description: "Learn English vocabulary seamlessly with Google Docs synchronization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
