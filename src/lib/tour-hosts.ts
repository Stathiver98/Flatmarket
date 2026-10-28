// External virtual-tour providers. Only URLs whose host is listed here can be
// embedded in an iframe on a presentation page; any other https URL is shown as
// a plain outbound link. Keep this list in sync with the providers' embed docs.

export type TourProvider = {
  id: string;
  name: string;
  hosts: string[];
  embedOrigin: string;
  // Turns a user-supplied share URL into an embeddable URL, or null if the
  // URL does not match the provider's known embeddable format.
  toEmbedUrl: (url: URL) => string | null;
};

export const TOUR_PROVIDERS: TourProvider[] = [
  {
    id: "matterport",
    name: "Matterport",
    hosts: ["my.matterport.com"],
    embedOrigin: "https://my.matterport.com",
    toEmbedUrl: (url) => {
      const m = url.searchParams.get("m");
      if (url.pathname.startsWith("/show") && m && /^[A-Za-z0-9]+$/.test(m)) {
        return `https://my.matterport.com/show/?m=${m}`;
      }
      return null;
    },
  },
  {
    id: "kuula",
    name: "Kuula",
    hosts: ["kuula.co"],
    embedOrigin: "https://kuula.co",
    toEmbedUrl: (url) => {
      const m = url.pathname.match(/^\/share\/(?:collection\/)?([A-Za-z0-9]+)/);
      if (!m) return null;
      return `https://kuula.co${url.pathname}`;
    },
  },
  {
    id: "youtube",
    name: "YouTube",
    hosts: ["www.youtube.com", "youtube.com", "youtu.be"],
    embedOrigin: "https://www.youtube-nocookie.com",
    toEmbedUrl: (url) => {
      let id: string | null = null;
      if (url.hostname === "youtu.be") id = url.pathname.slice(1);
      else if (url.pathname === "/watch") id = url.searchParams.get("v");
      else {
        const m = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
        if (m) id = m[1];
      }
      if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
      return `https://www.youtube-nocookie.com/embed/${id}`;
    },
  },
];

export const TOUR_EMBED_ORIGINS = TOUR_PROVIDERS.map((p) => p.embedOrigin);

export type ParsedTourUrl =
  | { ok: true; url: string; embedUrl: string | null; providerName: string | null }
  | { ok: false; error: string };

export function parseTourUrl(raw: string): ParsedTourUrl {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Ο σύνδεσμος δεν είναι έγκυρος." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Επιτρέπονται μόνο ασφαλείς σύνδεσμοι (https://)." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Ο σύνδεσμος δεν επιτρέπεται να περιέχει στοιχεία σύνδεσης." };
  }
  const provider = TOUR_PROVIDERS.find((p) => p.hosts.includes(url.hostname));
  const embedUrl = provider ? provider.toEmbedUrl(url) : null;
  return {
    ok: true,
    url: url.toString(),
    embedUrl,
    providerName: provider?.name ?? null,
  };
}
