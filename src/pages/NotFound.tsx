import { Link } from "react-router-dom";
import { NestoCard, NestoButton } from "@/components/polar";
import { NestoLogo } from "@/components/polar/NestoLogo";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <NestoCard className="max-w-md w-full p-8 text-center space-y-6">
        <NestoLogo size="md" showWordmark={false} className="justify-center" />
        <div>
          <h1 className="text-5xl font-extrabold text-primary mb-2">404</h1>
          <p className="text-lg text-muted-foreground">
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
