interface Props {
  current: 1 | 2 | 3;
  brandColor: string;
}

export function ApplicationProgress({ current, brandColor }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: n === current ? 32 : 16,
            backgroundColor: n <= current ? brandColor : '#E5E7EB',
          }}
        />
      ))}
    </div>
  );
}
