import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="flex-1 min-h-[40vh] bg-[linear-gradient(180deg,#FFFDF9_0%,#F7F5F2_45%,#F0EDE8_100%)]">
        {children}
      </main>
      <Footer />
    </>
  );
}
