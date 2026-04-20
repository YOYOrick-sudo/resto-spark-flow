import { ModuleSubNav } from "@/components/polar";
import { KAARTBEHEER_SUBNAV } from "@/lib/moduleSubNav";
import { GerechtOverzicht } from "@/components/kaartbeheer/GerechtOverzicht";

export default function Kaartbeheer() {
  return (
    <div className="space-y-6">
      <ModuleSubNav items={KAARTBEHEER_SUBNAV} />
      <GerechtOverzicht />
    </div>
  );
}
