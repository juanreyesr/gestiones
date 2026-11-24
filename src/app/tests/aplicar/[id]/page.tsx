import type { Metadata } from "next";
import { AplicarTest } from "@/components/tests/aplicar-test";

export const metadata: Metadata = { title: "Responder test", robots: { index: false } };

export default async function AplicarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
      <AplicarTest id={id} />
    </div>
  );
}
