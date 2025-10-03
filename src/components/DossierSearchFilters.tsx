import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type DossierFilters = {
  search: string;
  flow: "ALL" | "LOC" | "REP";
  status: string;
  priority: "ALL" | "HIGH" | "MEDIUM" | "LOW";
};

interface DossierSearchFiltersProps {
  filters: DossierFilters;
  onFiltersChange: (filters: DossierFilters) => void;
  onReset: () => void;
}

export function DossierSearchFilters({ filters, onFiltersChange, onReset }: DossierSearchFiltersProps) {
  const hasActiveFilters = 
    filters.search !== "" ||
    filters.flow !== "ALL" ||
    filters.status !== "ALL" ||
    filters.priority !== "ALL";

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card" role="search" aria-label="Dossier filters">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            aria-label="Reset alle filters"
          >
            <X className="h-4 w-4 mr-2" aria-hidden="true" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Zoeken</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="search"
              placeholder="Naam, NIS, Polis..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-9"
              aria-label="Zoek op naam, NIS of polisnummer"
            />
          </div>
        </div>

        {/* Flow */}
        <div className="space-y-2">
          <Label htmlFor="flow">Flow Type</Label>
          <Select
            value={filters.flow}
            onValueChange={(value) => onFiltersChange({ ...filters, flow: value as DossierFilters["flow"] })}
          >
            <SelectTrigger id="flow" aria-label="Selecteer flow type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle</SelectItem>
              <SelectItem value="LOC">Lokaal (LOC)</SelectItem>
              <SelectItem value="REP">Repatriëring (REP)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger id="status" aria-label="Selecteer status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle</SelectItem>
              <SelectItem value="CREATED">Aangemaakt</SelectItem>
              <SelectItem value="INTAKE_PENDING">Intake Lopend</SelectItem>
              <SelectItem value="INTAKE_COMPLETE">Intake Compleet</SelectItem>
              <SelectItem value="PLANNED">Gepland</SelectItem>
              <SelectItem value="IN_PROGRESS">In Behandeling</SelectItem>
              <SelectItem value="COMPLETED">Voltooid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Prioriteit</Label>
          <Select
            value={filters.priority}
            onValueChange={(value) => onFiltersChange({ ...filters, priority: value as DossierFilters["priority"] })}
          >
            <SelectTrigger id="priority" aria-label="Selecteer prioriteit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle</SelectItem>
              <SelectItem value="HIGH">Hoog</SelectItem>
              <SelectItem value="MEDIUM">Normaal</SelectItem>
              <SelectItem value="LOW">Laag</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2" role="status" aria-live="polite" aria-label="Actieve filters">
          {filters.search && (
            <Badge variant="secondary">
              Zoekterm: {filters.search}
              <button
                onClick={() => onFiltersChange({ ...filters, search: "" })}
                className="ml-2 hover:text-destructive"
                aria-label="Verwijder zoekterm filter"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {filters.flow !== "ALL" && (
            <Badge variant="secondary">
              Flow: {filters.flow}
              <button
                onClick={() => onFiltersChange({ ...filters, flow: "ALL" })}
                className="ml-2 hover:text-destructive"
                aria-label="Verwijder flow filter"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {filters.status !== "ALL" && (
            <Badge variant="secondary">
              Status: {filters.status}
              <button
                onClick={() => onFiltersChange({ ...filters, status: "ALL" })}
                className="ml-2 hover:text-destructive"
                aria-label="Verwijder status filter"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {filters.priority !== "ALL" && (
            <Badge variant="secondary">
              Prioriteit: {filters.priority}
              <button
                onClick={() => onFiltersChange({ ...filters, priority: "ALL" })}
                className="ml-2 hover:text-destructive"
                aria-label="Verwijder prioriteit filter"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
