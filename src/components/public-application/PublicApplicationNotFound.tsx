export function PublicApplicationNotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 font-[Inter,sans-serif]">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Pagina niet gevonden</h1>
        <p className="text-sm text-gray-600">
          Deze sollicitatiepagina bestaat niet of is niet meer actief.
        </p>
      </div>
    </div>
  );
}
