import { redirect } from "next/navigation";

// Keep previously shared graph URLs working while discovery lives on one page.
export default async function LegacyGraph({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const id = Array.isArray(params.book_id) ? params.book_id[0] : params.book_id;
  redirect(id ? `/?book_id=${encodeURIComponent(id)}` : "/");
}
