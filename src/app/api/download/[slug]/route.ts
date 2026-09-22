import { readFileSync } from "node:fs";
import { NextResponse, type NextRequest } from "next/server";
import { downloadPath, resourceBySlug } from "@/lib/resources";
import { verifyToken } from "@/lib/download-token";

/* Serves a gated file to a signed link. The file lives outside
   /public, so this route is the only way to it.

   Every failure returns the same 403 and the same wording: telling
   a probe whether a token was forged, expired, or simply for the
   wrong slug is more help than it's worth. */

export const runtime = "nodejs";

const DENIED = "This download link isn't valid any more. Ask for the file again on the resource page and we'll send a fresh link.";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get("t");

  const check = verifyToken(token, slug);
  if (!check.ok) {
    return new NextResponse(DENIED, {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const resource = resourceBySlug(slug);
  if (!resource?.downloadFile) {
    return new NextResponse(DENIED, { status: 403 });
  }

  const path = downloadPath(resource.downloadFile);
  if (!path) {
    console.error(`[4i] download missing on disk: ${resource.downloadFile}`);
    return new NextResponse("That file has gone missing. Email info@4irecords.com.", {
      status: 500,
    });
  }

  /* Typed from the extension rather than assumed to be a PDF. The real
     resources deliver a zip — a PDF plus the working spreadsheet and the
     README — and serving that as application/pdf makes a browser try to
     render it and fail. */
  const TYPES: Record<string, string> = {
    ".zip": "application/zip",
    ".pdf": "application/pdf",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  const ext = resource.downloadFile.slice(resource.downloadFile.lastIndexOf("."));

  const file = readFileSync(path);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "content-type": TYPES[ext] ?? "application/octet-stream",
      "content-disposition": `attachment; filename="${resource.slug}${ext}"`,
      /* Never cached by a CDN: the URL is per-person and expiring. */
      "cache-control": "private, no-store",
    },
  });
}
