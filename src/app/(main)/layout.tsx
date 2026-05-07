import Header from "@/components/layout/Header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">{children}</main>
    </>
  );
}
