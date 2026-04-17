interface PublicApplicationInactiveProps {
  branding: {
    location_name: string;
    logo_url: string | null;
    brand_color: string | null;
  } | null;
}

export function PublicApplicationInactive({ branding }: PublicApplicationInactiveProps) {
  const brandColor = branding?.brand_color ?? '#1d979e';
  const name = branding?.location_name ?? '';

  return (
    <div
      className="light min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 font-[Inter,sans-serif]"
      style={{ ['--brand' as string]: brandColor, colorScheme: 'light' }}
    >
      <div className="max-w-md w-full text-center">
        {branding?.logo_url && (
          <img
            src={branding.logo_url}
            alt={name}
            className="h-12 mx-auto mb-6 object-contain"
          />
        )}
        <div
          className="inline-block w-12 h-1 rounded-full mb-6"
          style={{ backgroundColor: brandColor }}
          aria-hidden
        />
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Pagina is tijdelijk offline
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          {name
            ? `De sollicitatiepagina van ${name} is op dit moment niet beschikbaar. Kom binnenkort terug of neem direct contact op met het restaurant.`
            : 'Deze sollicitatiepagina is op dit moment niet beschikbaar. Kom binnenkort terug.'}
        </p>
      </div>
    </div>
  );
}
