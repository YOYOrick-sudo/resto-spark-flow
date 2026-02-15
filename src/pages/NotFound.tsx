import { Link } from "react-router-dom";
import { NestoCard, NestoButton } from "@/components/polar";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <NestoCard className="max-w-md w-full p-8 text-center">
        <h1 className="text-5xl font-extrabold text-primary mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Pagina niet gevonden
        </p>
        <Link to="/">
          <NestoButton>Terug naar Dashboard</NestoButton>
        </Link>
      </NestoCard>
    </div>
  );
};

export default NotFound;
