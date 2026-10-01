import Image from 'next/image';
import Link from 'next/link';
import {
  guideHref,
  isGuideReady,
  PROTOCOL_GUIDES,
  UPCOMING_GUIDE_SLOTS,
  type ProtocolGuide,
} from '@/domain/showcase/protocol-guides';

/**
 * The Tides Protocol Library — the useful centre of the page.
 *
 * The one light, calm section after the hero: warm ivory, the protocol cards'
 * own palette, and the owner's artwork as the focal point. Until a guide's
 * artwork exists its slot is a poster frame — deliberately not a diagram, so
 * nothing on the page competes with, or pretends to be, the real guide.
 *
 * Nothing here restates a guide's content. Title, focus, compounds and one
 * sentence come from the register; the rest is the artwork.
 */

export function ProtocolGallery() {
  // Ready guides lead, in register order; finished artwork always comes first.
  const ordered = [...PROTOCOL_GUIDES].sort((a, b) => Number(isGuideReady(b)) - Number(isGuideReady(a)));
  const [featured, ...rest] = ordered;
  // A quiet "more coming" row or two — fewer as real guides arrive, none once the shelf is full.
  const upcoming = Math.max(0, Math.min(UPCOMING_GUIDE_SLOTS - 1, 3 - ordered.length));

  return (
    <section id="protocols" className="sx-light" aria-labelledby="protocols-title">
      <div className="sx-wrap">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end" data-reveal>
          <div>
            <p className="sx-kicker">The Tides Protocol Library</p>
            <h2 id="protocols-title" className="sx-h2 mt-6 max-w-[14ch]">
              Protocol guides available now.
            </h2>
          </div>
          <p className="sx-lede max-w-[40ch] lg:pb-3">
            Visual research protocols designed to be understood at a glance, saved and returned to.
          </p>
        </div>

        {featured !== undefined ? <FeaturedGuide guide={featured} /> : null}

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16">
          {rest.map((guide, i) => (
            <div key={guide.slug} data-reveal style={{ '--delay': `${String(i * 0.08)}s` } as React.CSSProperties}>
              <GuideCard guide={guide} />
            </div>
          ))}
          {Array.from({ length: upcoming }, (_, i) => (
            <div key={`upcoming-${String(i)}`} data-reveal style={{ '--delay': `${String((rest.length + i) * 0.08)}s` } as React.CSSProperties}>
              <UpcomingSlot />
            </div>
          ))}
        </div>

        {/* The page's one contextual statement, where it matters: under the guides. */}
        <p className="mt-12 max-w-[68ch] pb-[clamp(4rem,8vw,6rem)] text-sm leading-relaxed text-[var(--tides-soft)]" data-reveal>
          Guides summarise what published research and practitioners report. They are for education, not medical
          advice — speak with a qualified clinician about any treatment decision.
        </p>
      </div>
      <div className="sx-handback" aria-hidden="true" />
    </section>
  );
}

function FeaturedGuide({ guide }: { guide: ProtocolGuide }) {
  const ready = isGuideReady(guide);
  return (
    <article
      className="mt-14 grid items-center gap-10 sm:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
      data-reveal="scale"
      aria-labelledby={`guide-${guide.slug}`}
    >
      <div className="mx-auto w-full max-w-[34rem] lg:mx-0">
        {ready ? (
          <Link href={guideHref(guide)} className="sx-poster sx-poster-lift block" aria-label={`Open ${guide.title}`}>
            <Image
              src={guide.artwork.src}
              width={guide.artwork.width}
              height={guide.artwork.height}
              alt={guide.artwork.alt}
              sizes="(min-width: 1024px) 40vw, 92vw"
              className="h-auto w-full"
            />
          </Link>
        ) : (
          <PosterSlot guide={guide} />
        )}
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--tides-mineral)]">Featured guide</p>
        <h3 id={`guide-${guide.slug}`} className="mt-4 text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--tides-deep)]">
          {guide.title}
        </h3>
        <p className="mt-3 text-lg text-[var(--tides-soft)]">{guide.focus}</p>
        <span className="sx-gold-rule mt-7" aria-hidden="true" />
        <p className="mt-7 max-w-[46ch] text-[1.075rem] leading-relaxed text-[var(--tides-graphite)]">{guide.description}</p>

        <ul className="mt-8 flex flex-wrap gap-2.5" aria-label="Compounds in this guide">
          {guide.compounds.map((c) => (
            <li key={c} className="sx-chip-light">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--tides-mineral)]" aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>

        <div className="mt-10">
          {ready ? (
            <Link href={guideHref(guide)} className="sx-btn sx-btn-deep">
              Explore the guide <span className="sx-arrow" aria-hidden="true">→</span>
            </Link>
          ) : (
            <p className="text-sm font-medium text-[var(--tides-soft)]">Coming to the library soon.</p>
          )}
        </div>
      </div>
    </article>
  );
}

function GuideCard({ guide }: { guide: ProtocolGuide }) {
  const ready = isGuideReady(guide);
  const body = (
    <>
      {ready ? (
        <div className="relative aspect-[4/5]">
          <Image src={guide.artwork.src} alt={guide.artwork.alt} fill sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 92vw" className="object-cover object-top" />
        </div>
      ) : (
        <PosterSlot guide={guide} compact />
      )}
      <div className="px-6 pb-6 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tides-mineral)]">{guide.focus}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.015em] text-[var(--tides-deep)]">{guide.title}</h3>
        <p className="mt-1.5 text-sm text-[var(--tides-soft)]">{guide.compounds.join(' · ')}</p>
      </div>
    </>
  );
  return ready ? (
    <Link href={guideHref(guide)} className="sx-poster sx-poster-lift block h-full">
      {body}
    </Link>
  ) : (
    <div className="sx-poster h-full">{body}</div>
  );
}

/**
 * Where a guide's artwork will sit. A paper poster frame in the cards' own
 * language — the brand band, the title, a gold hairline — with the body left
 * quietly empty. It names only what the register names.
 */
function PosterSlot({ guide, compact = false }: { guide: ProtocolGuide; compact?: boolean }) {
  return (
    <div className={compact ? 'relative aspect-[4/5]' : 'sx-poster relative aspect-[4/5]'}>
      <div className="flex h-full flex-col">
        <div className="bg-[var(--tides-deep)] px-[8%] py-[6%] text-white">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9ed6d6] sm:text-[0.68rem]">
            The Tides Index · Protocol guide
          </p>
          <p className={`mt-2 font-semibold leading-tight tracking-[-0.02em] ${compact ? 'text-lg' : 'text-[clamp(1.25rem,2.4vw,1.85rem)]'}`}>
            {guide.title}
          </p>
        </div>
        <div className="relative flex-1 bg-[linear-gradient(180deg,#ffffff,#f7f4ed)] px-[8%] py-[7%]">
          <span className="block h-px w-12 bg-[var(--tides-gold)]" aria-hidden="true" />
          {/* ruled, empty body: the shape of a guide, none of its content */}
          <div className="mt-[8%] space-y-[6%]" aria-hidden="true">
            {[88, 72, 80, 64].map((w, i) => (
              <div key={i} className="flex items-center gap-[5%]">
                <span className="h-[0.7rem] w-[0.7rem] shrink-0 rounded-full border border-[var(--tides-rule)]" />
                <span className="h-px flex-1 bg-[var(--tides-rule)]" style={{ maxWidth: `${String(w)}%` }} />
              </div>
            ))}
          </div>
          <p className="absolute inset-x-0 bottom-[7%] text-center text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--tides-soft)]">
            Guide artwork arriving
          </p>
        </div>
      </div>
    </div>
  );
}

/** A compact row for a guide still in preparation: present, not a large empty frame. */
function UpcomingSlot() {
  return (
    <div className="sx-poster flex items-center gap-5 p-4 sm:p-5">
      <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg bg-[linear-gradient(160deg,#ffffff,#efeadf)] sm:w-24">
        <div className="h-[22%] bg-[var(--tides-deep)]" aria-hidden="true" />
        <span className="absolute left-[16%] top-[34%] block h-px w-[40%] bg-[var(--tides-gold)]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tides-mineral)]">In preparation</p>
        <p className="mt-1.5 text-lg font-semibold tracking-[-0.015em] text-[var(--tides-deep)]">Next protocol guide</p>
        <p className="mt-1 text-sm text-[var(--tides-soft)]">Coming to the library soon.</p>
      </div>
    </div>
  );
}
