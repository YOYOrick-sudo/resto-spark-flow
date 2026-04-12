import * as React from "react";
import { NestoSelect, NestoBadge } from "@/components/polar";
import { useAllergenen, type IngredientRow } from "@/hooks/useIngredienten";
import { useIngredientMutations } from "@/hooks/useIngredientMutations";
import { Spinner } from "@/components/polar";

const STATUS_OPTIONS = [
  { value: "bevat", label: "Bevat" },
  { value: "kan_bevatten", label: "Kan bevatten" },
  { value: "geen", label: "Geen" },
  { value: "onbekend", label: "Onbekend" },
];

interface AllergenenTabProps {
  ingredient: IngredientRow;
}

export function AllergenenTab({ ingredient }: AllergenenTabProps) {
  const { data: allergenen, isLoading } = useAllergenen();
  const { upsertAllergeenStatus } = useIngredientMutations();

  if (isLoading) return <Spinner className="mx-auto mt-8" />;
  if (!allergenen) return null;

  // Map existing allergen statuses
  const statusMap = new Map(
    ingredient.ingredient_allergenen.map((ia) => [ia.allergeen_id, { status: ia.status, bron: ia.bron }])
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      {allergenen.map((a) => {
        const existing = statusMap.get(a.id);
        const currentStatus = existing?.status || "onbekend";
        const bron = existing?.bron;

        return (
          <div key={a.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{a.naam_nl}</span>
              {bron && (
                <NestoBadge variant={bron === "api" ? "primary" : "default"} size="sm">
                  {bron === "api" ? "API" : "Handmatig"}
                </NestoBadge>
              )}
            </div>
            <NestoSelect
              value={currentStatus}
              onValueChange={(newStatus) => {
                upsertAllergeenStatus.mutate({
                  ingredientId: ingredient.id,
                  allergeenId: a.id,
                  status: newStatus,
                });
              }}
              options={STATUS_OPTIONS}
              size="sm"
            />
          </div>
        );
      })}
    </div>
  );
}
