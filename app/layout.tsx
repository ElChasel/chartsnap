import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "ChartSnap — Professional Plotting for Everyone | 611 Studio",
  description:
    "Upload Excel or CSV, select exact records, customize scientific charts and export high-resolution PNG or vector SVG. Local processing, no account required.",
  metadataBase: new URL("https://chartsnap-studio.super-ash-1449.chatgpt.site"),
  manifest:'/site.webmanifest',
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon-16x16.png", sizes: "16x16" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    title: "ChartSnap — Your Data, Beautifully Understood.",
    description:
      "Professional data visualization, thoughtful analysis. A product by 611 Studio.",
    images: [
      {
        url: "/social-preview.png",
        width: 1200,
        height: 630,
        alt: "ChartSnap · 611 Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChartSnap | 611 Studio",
    images: ["/social-preview.png"],
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
