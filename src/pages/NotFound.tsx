import { Link } from "react-router-dom";
import { NestoCard, NestoButton } from "@/components/polar";
import { NestoLogo } from "@/components/polar/NestoLogo";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(220,15%,13%)] p-4">
      <NestoCard className="max-w-md w-full p-8 text-center space-y-6 bg-[hsl(220,15%,18%)] border-white/10">
        <NestoLogo size="md" showWordmark={false} className="justify-center" />
        <div>
          <h1 className="text-5xl font-extrabold text-white mb-2">404</h1>
          <p className="text-lg text-white/50">
            Deze pagina bestaat niet
          </p>
        </div>
        <Link to="/">
          <NestoButton>Terug naar Dashboard</NestoButton>
        </Link>
      </NestoCard>
    </div>
  );
};

export default NotFound;
