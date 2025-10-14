import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  
  const hasActiveFilters = 
    filters.search !== "" ||
    filters.flow !== "ALL" ||
    filters.status !== "ALL" ||
    filters.priority !== "ALL";

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card" role="search" aria-label="Dossier filters">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("filters.title")}</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            aria-label={t("filters.resetAll")}
          >
            <X className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("filters.reset")}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">{t("filters.search")}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="search"
              placeholder={t("filters.searchPlaceholder")}
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-9"
              aria-label={t("filters.searchAria")}
            />
          </div>
        </div>

        {/* Flow */}
        <div className="space-y-2">
          <Label htmlFor="flow">{t("filters.flowType")}</Label>
          <Select
            value={filters.flow}
            onValueChange={(value) => onFiltersChange({ ...filters, flow: value as DossierFilters["flow"] })}
          >
            <SelectTrigger id="flow" aria-label={t("filters.selectFlowType")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.all")}</SelectItem>
              <SelectItem value="LOC">{t("flow.local")} (LOC)</SelectItem>
              <SelectItem value="REP">{t("flow.repatriation")} (REP)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">{t("filters.status")}</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger id="status" aria-label={t("filters.selectStatus")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.all")}</SelectItem>
              <SelectItem value="CREATED">{t("dossiers.status.created")}</SelectItem>
              <SelectItem value="INTAKE_PENDING">{t("dossiers.status.intakePending")}</SelectItem>
              <SelectItem value="INTAKE_COMPLETE">{t("dossiers.status.intakeComplete")}</SelectItem>
              <SelectItem value="PLANNED">{t("dossiers.status.planned")}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t("dossiers.status.inProgress")}</SelectItem>
              <SelectItem value="COMPLETED">{t("dossiers.status.completed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">{t("filters.priority")}</Label>
          <Select
            value={filters.priority}
            onValueChange={(value) => onFiltersChange({ ...filters, priority: value as DossierFilters["priority"] })}
          >
            <SelectTrigger id="priority" aria-label={t("filters.selectPriority")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.all")}</SelectItem>
              <SelectItem value="HIGH">{t("common.priority.high")}</SelectItem>
              <SelectItem value="MEDIUM">{t("common.priority.medium")}</SelectItem>
              <SelectItem value="LOW">{t("common.priority.low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2" role="status" aria-live="polite" aria-label={t("filters.activeFilters")}>
          {filters.search && (
            <Badge variant="secondary">
              {t("filters.searchTerm")} {filters.search}
              <button
                onClick={() => onFiltersChange({ ...filters, search: "" })}
                className="ml-2 hover:text-destructive"
                aria-label={t("filters.removeSearchTerm")}
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
                aria-label={t("filters.removeFlow")}
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
                aria-label={t("filters.removeStatus")}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {filters.priority !== "ALL" && (
            <Badge variant="secondary">
              {t("filters.priority")}: {filters.priority}
              <button
                onClick={() => onFiltersChange({ ...filters, priority: "ALL" })}
                className="ml-2 hover:text-destructive"
                aria-label={t("filters.removePriority")}
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
