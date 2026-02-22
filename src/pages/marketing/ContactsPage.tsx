import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { StatCard } from '@/components/polar/StatCard';
import { NestoTable, type Column } from '@/components/polar/NestoTable';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { SearchBar } from '@/components/polar/SearchBar';
import { EmptyState } from '@/components/polar/EmptyState';
import { TableSkeleton } from '@/components/polar/LoadingStates';
import { ContactOptInSheet } from '@/components/marketing/contacts/ContactOptInSheet';
import { ImportContactsModal } from '@/components/marketing/contacts/ImportContactsModal';
import { useMarketingContacts, useNewContactsThisMonth, exportContactsCsv, type MarketingContact } from '@/hooks/useMarketingContacts';
import { useMarketingSegments } from '@/hooks/useMarketingSegments';
import { useUserContext } from '@/contexts/UserContext';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function ContactsPage() {
  const { data: segments = [] } = useMarketingSegments();
  const { currentLocation } = useUserContext();
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('__all__');
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<MarketingContact | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const selectedSegment = selectedSegmentId !== '__all__' ? segments.find(s => s.id === selectedSegmentId) : undefined;
  const filterRules = selectedSegment?.filter_rules ?? null;

  const { data: contacts = [], isLoading } = useMarketingContacts(filterRules, search);
  const { data: newThisMonth = 0 } = useNewContactsThisMonth();

  const segmentOptions = [
    { value: '__all__', label: 'Alle contacten' },
    ...segments.map(s => ({ value: s.id, label: s.name })),
  ];

  const handleExport = () => {
    if (!currentLocation) return;
    exportContactsCsv(currentLocation.id, filterRules, search);
  };

  const columns: Column<MarketingContact & Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Naam',
      render: (item) => (
        <span className="font-semibold text-foreground">{item.first_name} {item.last_name}</span>
      ),
    },
    {
      key: 'email',
      header: 'E-mail',
      render: (item) => item.email ?? '',
    },
    {
      key: 'total_visits',
      header: 'Bezoeken',
      render: (item) => item.total_visits,
      className: 'text-right w-24 tabular-nums',
      headerClassName: 'text-right',
    },
    {
      key: 'last_visit_at',
      header: 'Laatste bezoek',
      render: (item) =>
        item.last_visit_at
          ? formatDistanceToNow(new Date(item.last_visit_at), { addSuffix: true, locale: nl })
          : '',
    },
    {
      key: 'average_spend',
      header: 'Gem. besteding',
      render: (item) =>
        item.average_spend != null ? `€${Number(item.average_spend).toFixed(2)}` : '',
      className: 'text-right w-32 tabular-nums',
      headerClassName: 'text-right',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Contacten"
        subtitle="Beheer je gastenbestand en marketing voorkeuren"
        actions={[
          { label: 'Exporteer', onClick: handleExport, variant: 'outline', icon: Download },
          { label: 'Importeer', onClick: () => setImportOpen(true), variant: 'outline', icon: Upload },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Totaal contacten"
          value={isLoading ? '...' : contacts.length}
        />
        <StatCard
          label="Nieuw deze maand"
          value={`+${newThisMonth}`}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <NestoSelect
            placeholder="Filter op segment"
            value={selectedSegmentId}
            onValueChange={setSelectedSegmentId}
            options={segmentOptions}
          />
        </div>
        <div className="flex-1">
          <SearchBar
            placeholder="Zoek op naam of e-mail..."
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : contacts.length === 0 ? (
        <EmptyState
          title="Geen contacten gevonden"
          description={search || selectedSegmentId ? 'Pas je filters aan.' : 'Er zijn nog geen gasten in je bestand.'}
        />
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <NestoTable
            columns={columns}
            data={contacts as (MarketingContact & Record<string, unknown>)[]}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => setSelectedContact(item)}
          />
        </div>
      )}

      <ContactOptInSheet
        open={!!selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
        contact={selectedContact}
      />

      <ImportContactsModal
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}
