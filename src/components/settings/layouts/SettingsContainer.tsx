interface SettingsContainerProps {
  children: React.ReactNode;
  /** Optional contextual panel (help, AI hints) */
  aside?: React.ReactNode;
}

/**
 * Enterprise settings container with intentional centered layout.
 * - Single column: content fills max-w-5xl, centered
 * - With aside: responsive 2-column grid (stacked until xl)
 */
export function SettingsContainer({ children, aside }: SettingsContainerProps) {
  if (aside) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 xl:items-start">
          <div>{children}</div>
          {/* pt-[88px] aligns aside cards with main content card (below breadcrumb + header) */}
          <aside className="xl:pt-[88px]">{aside}</aside>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {children}
    </div>
  );
}
