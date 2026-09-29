import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getReadingMode } from '@/server/public/reading-mode';
import { getStackPage, STACK_DEFINITIONS, stackDefinition } from '@/server/public/stacks';
import { StackExperience } from '@/components/public/stack-experience';
import { ModeSwitch } from '@/components/public/mode-switch';

export const dynamic = 'force-dynamic';

export function generateStaticParams(): { slug: string }[] {
  return STACK_DEFINITIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const definition = stackDefinition(slug);
  if (definition === null) return { title: 'Combination not found' };
  return { title: definition.title, description: definition.summary };
}

export default async function StackRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mode = await getReadingMode();
  const stack = await getStackPage(slug, mode);
  if (stack === null) notFound();

  return (
    <>
      {/* Shrink-wrapped: the switch right-aligns its own caption, which flies
          to the far edge if it is given the width of the page. */}
      <div className="mx-auto max-w-[72rem] px-4 pt-6 md:px-8">
        <div className="inline-block">
          <ModeSwitch mode={mode} path={`/protocols/stacks/${stack.slug}`} />
        </div>
      </div>
      <StackExperience stack={stack} simple={mode === 'simple'} />
    </>
  );
}
