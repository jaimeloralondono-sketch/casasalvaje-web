// GET /api/playlist?id=... -> { tracks: ["<id>", ...] } con las canciones de una playlist pública de Spotify.
// El reproductor del sitio las usa para empezar siempre en una canción al azar (el embed de Spotify siempre empieza por la primera).
const json = (data, status = 200, cache = "public, max-age=600, s-maxage=21600") =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache } });

export default async (req) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[A-Za-z0-9]{22}$/.test(id)) return json({ error: "id" }, 400, "no-store");
  try {
    const r = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", "Accept-Language": "en" },
    });
    if (!r.ok) throw new Error(r.status);
    const html = await r.text();
    const tracks = [...new Set([...html.matchAll(/spotify:track:([A-Za-z0-9]{22})/g)].map((m) => m[1]))];
    if (!tracks.length) throw new Error("vacía");
    return json({ tracks });
  } catch (e) {
    return json({ error: "spotify" }, 502, "no-store");
  }
};

export const config = { path: "/api/playlist" };
