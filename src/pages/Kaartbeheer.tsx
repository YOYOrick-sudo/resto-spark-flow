import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ModuleSubNav, PageHeader, NestoButton } from "@/components/polar";
import { KAARTBEHEER_SUBNAV } from "@/lib/moduleSubNav";
import { GerechtOverzicht } from "@/components/kaartbeheer/GerechtOverzicht";

export default function Kaartbeheer() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <ModuleSubNav items={KAARTBEHEER_SUBNAV} />
      <PageHeader
        title="Gerechten"
        actions={
          <NestoButton leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate("/kaartbeheer/nieuw")}>
            Nieuw gerecht
          </NestoButton>
        }
      />
      <GerechtOverzicht />
    </div>
  );
}
