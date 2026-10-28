import Link from "next/link";
import { db } from "@/server/db";
import { requireUser, getUserWorkspaces } from "@/server/auth/guards";
import { createListingAction } from "@/server/actions/listings";
import { Alert, EmptyState, StatusBadge, Badge } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { Button, LinkButton } from "@/components/ui/button";
import { ListingRowActions } from "@/components/app/listing-row-actions";
import { defaultTitle, formatDateTime, formatPrice, publicLocation } from "@/lib/listing/format";
import { LISTING_STATUSES } from "@/lib/listing/options";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Οι αγγελίες μου" };

const STATUS_VALUES = LISTING_STATUSES.map((s) => s.value) as string[];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("/app");
  const sp = await searchParams;
  const workspaces = await getUserWorkspaces(user.id);
  const wsIds = workspaces.map((w) => w.id);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const status = STATUS_VALUES.includes(sp.status ?? "") ? sp.status : undefined;
  const ws = wsIds.includes(sp.ws ?? "") ? sp.ws : undefined;

  const where: Prisma.ListingWhereInput = {
    workspaceId: ws ? ws : { in: wsIds },
    ...(status ? { status: status as Prisma.ListingWhereInput["status"] } : { status: { not: "ARCHIVED" } }),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
            { municipality: { contains: q, mode: "insensitive" } },
            { neighborhood: { contains: q, mode: "insensitive" } },
            { region: { contains: q, mode: "insensitive" } },
            { content: { some: { key: "headline", text: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const [listings, counts] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        photos: { where: { includeInListing: true }, orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1 },
        content: { where: { key: "headline", lang: "el" } },
        workspace: { select: { displayName: true } },
        _count: { select: { enquiries: { where: { readAt: null } } } },
      },
    }),
    db.listing.groupBy({ by: ["status"], where: { workspaceId: { in: wsIds } }, _count: true }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((a, c) => a + (c.status === "ARCHIVED" ? 0 : c._count), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {sp.welcome && (
        <Alert tone="success" className="mb-6" title="Καλώς ήρθατε στο Flatmarket">
          Ξεκινήστε δημιουργώντας την πρώτη σας αγγελία. Μπορείτε να σταματήσετε σε οποιοδήποτε βήμα — όλα αποθηκεύονται.
        </Alert>
      )}
      {sp.deleted && <Alert tone="success" className="mb-6">Η αγγελία και τα αρχεία της διαγράφηκαν οριστικά.</Alert>}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl text-ink">Αγγελίες</h1>
          <p className="mt-1 text-sm text-ink-muted">{total === 1 ? "1 ενεργή αγγελία" : `${total} ενεργές αγγελίες`}</p>
        </div>
        <form action={createListingAction} className="flex gap-2">
          {workspaces.length > 1 && (
            <Select name="workspaceId" aria-label="Χώρος εργασίας" className="w-auto">
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.displayName}
                </option>
              ))}
            </Select>
          )}
          <Button type="submit" size="lg">+ Νέα αγγελία</Button>
        </form>
      </div>

      <nav aria-label="Φίλτρο κατάστασης" className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {[{ value: undefined, el: "Όλες (εκτός αρχείου)" }, ...LISTING_STATUSES].map((s) => {
          const active = status === s.value;
          const params = new URLSearchParams();
          if (s.value) params.set("status", s.value);
          if (q) params.set("q", q);
          if (ws) params.set("ws", ws);
          return (
            <Link
              key={s.value ?? "all"}
              href={`/app${params.size ? `?${params}` : ""}`}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${active ? "border-ink bg-ink text-paper" : "border-stone-300 bg-paper text-ink-soft hover:border-stone-400"}`}
            >
              {s.el}
              {s.value && <span className="ml-1.5 opacity-60">{countOf(s.value)}</span>}
            </Link>
          );
        })}
      </nav>

      <form className="mt-4 flex flex-col gap-2 sm:flex-row" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <Input name="q" defaultValue={q} placeholder="Αναζήτηση με τίτλο, περιοχή ή κωδικό (π.χ. FM-…)" aria-label="Αναζήτηση" className="sm:max-w-md" />
        {workspaces.length > 1 && (
          <Select name="ws" defaultValue={ws ?? ""} aria-label="Χώρος εργασίας" className="sm:w-60">
            <option value="">Όλοι οι χώροι εργασίας</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.displayName}</option>
            ))}
          </Select>
        )}
        <Button type="submit" variant="secondary">Αναζήτηση</Button>
      </form>

      <div className="mt-8">
        {listings.length === 0 ? (
          q || status ? (
            <EmptyState title="Δεν βρέθηκαν αγγελίες">Δοκιμάστε διαφορετική αναζήτηση ή φίλτρο.</EmptyState>
          ) : (
            <EmptyState
              title="Δεν έχετε ακόμη αγγελίες"
              action={
                <form action={createListingAction}>
                  <Button type="submit" size="lg">Δημιουργία πρώτης αγγελίας</Button>
                </form>
              }
            >
              Θα σας καθοδηγήσουμε βήμα-βήμα: στοιχεία, φωτογραφίες, κείμενα, έλεγχος και δημοσίευση.
            </EmptyState>
          )
        ) : (
          <ul className="grid gap-4">
            {listings.map((l) => {
              const headline = l.content[0]?.approved ? l.content[0].text : null;
              const title = headline ?? l.title ?? defaultTitle(l, "el");
              const cover = l.photos[0];
              const loc = publicLocation({ ...l, locationPrecision: "AREA" });
              return (
                <li key={l.id} className="grid gap-4 rounded-[var(--radius-card)] border border-stone-200 bg-paper p-3 sm:grid-cols-[180px_1fr_auto] sm:items-center">
                  <Link href={`/app/listings/${l.id}`} className="block aspect-[4/3] overflow-hidden rounded-xl bg-stone-100" tabIndex={-1} aria-hidden="true">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/files/photos/${cover.id}?s=thumb`} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-full place-items-center text-xs text-ink-muted">Χωρίς φωτογραφία</span>
                    )}
                  </Link>
                  <div className="min-w-0 px-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={l.status} />
                      {l.status === "PUBLISHED" && <Badge>{l.visibility === "PUBLIC" ? "Δημόσια" : "Μόνο με σύνδεσμο"}</Badge>}
                      {l.hasUnpublishedChanges && <Badge tone="warning">Μη δημοσιευμένες αλλαγές</Badge>}
                      {l._count.enquiries > 0 && <Badge tone="accent">{l._count.enquiries} νέα μηνύματα</Badge>}
                      <span className="text-xs text-ink-muted">{l.reference}</span>
                    </div>
                    <Link href={`/app/listings/${l.id}`} className="mt-1.5 block truncate font-display text-xl text-ink hover:text-terracotta-700">
                      {title}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">
                      {[loc ?? "Χωρίς περιοχή", workspaces.length > 1 ? l.workspace.displayName : null].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {l.price || l.priceOnRequest ? formatPrice(l.price, l.priceOnRequest, l.purpose) : <span className="font-normal text-ink-muted">Χωρίς τιμή</span>}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">Τελευταία ενημέρωση: {formatDateTime(l.updatedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 px-1 sm:flex-col sm:items-stretch">
                    <LinkButton href={`/app/listings/${l.id}`} size="sm" variant="dark">
                      {l.status === "ARCHIVED" ? "Άνοιγμα" : "Συνέχεια επεξεργασίας"}
                    </LinkButton>
                    <ListingRowActions
                      listingId={l.id}
                      status={l.status}
                      canDownload={l.photos.length > 0}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
