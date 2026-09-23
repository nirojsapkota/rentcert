export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-6 rounded-lg border border-dashed border-line bg-surface p-8 text-center">
        <p className="text-ink-muted">{description}</p>
      </div>
    </section>
  );
}
