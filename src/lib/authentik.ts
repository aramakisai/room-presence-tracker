export interface AuthentikUser {
  pk: string;
  username: string;
  name: string;
  email: string;
  is_active: boolean;
  attributes: Record<string, unknown>;
  groups_obj: Array<{ pk: string; name: string }>;
}

async function fetchPage(baseUrl: string, token: string, page: number): Promise<{ results: AuthentikUser[]; next: string | null }> {
  const url = `${baseUrl}/api/v3/core/users/?is_active=true&page_size=100&page=${page}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Authentik API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { results: data.results, next: data.pagination?.next ?? null };
}

export async function fetchAuthentikUsers(): Promise<AuthentikUser[]> {
  const issuer = process.env.AUTHENTIK_ISSUER;
  const token = process.env.AUTHENTIK_API_TOKEN;
  if (!issuer || !token) throw new Error("AUTHENTIK_ISSUER or AUTHENTIK_API_TOKEN is not set");

  const baseUrl = new URL(issuer).origin;
  const all: AuthentikUser[] = [];
  let page = 1;

  while (true) {
    const { results, next } = await fetchPage(baseUrl, token, page);
    all.push(...results);
    if (!next) break;
    page++;
  }

  return all;
}
