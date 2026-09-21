// Enlaces externos que se pueden incrustar en la página en vez de solo
// abrirse en una pestaña nueva. Lista blanca deliberada: incrustar
// cualquier URL que alguien pegue significaría correr código de terceros
// sin control; el resto de enlaces se sigue mostrando como "Abrir enlace".

export type EmbedInfo = { kind: "prezi" | "youtube" | "drive"; embedUrl: string };

export function getEmbedInfo(rawUrl: string): EmbedInfo | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");

  if (host === "prezi.com") {
    return { kind: "prezi", embedUrl: url.toString() };
  }

  if (host === "youtube.com" || host === "youtu.be") {
    let videoId = "";
    if (host === "youtu.be") {
      videoId = url.pathname.slice(1);
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v") ?? "";
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.replace("/embed/", "");
    }
    if (!videoId) return null;
    return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${videoId}` };
  }

  if (host === "drive.google.com") {
    const match = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (!match) return null;
    return { kind: "drive", embedUrl: `https://drive.google.com/file/d/${match[1]}/preview` };
  }

  return null;
}
