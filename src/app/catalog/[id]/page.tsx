import { redirect } from 'next/navigation';
export default async function ProductAlias({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params; const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (value !== undefined) for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  redirect(`/ka/catalog/${encodeURIComponent(id)}${query.size ? `?${query}` : ''}`);
}
