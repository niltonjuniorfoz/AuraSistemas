import * as React from "react";
import {
  type ColumnDef, type SortingState, type VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Columns3, Search, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Placeholder da busca. Vazio esconde o campo. */
  searchPlaceholder?: string;
  /** Linhas por página (padrão 15). */
  pageSize?: number;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: TData) => void;
  /** Conteúdo extra na barra de ferramentas (filtros próprios da página). */
  toolbar?: React.ReactNode;
  /** Conteúdo extra no fim da barra, depois do botão "Colunas" (ex.: ação "Novo X"). */
  headerEnd?: React.ReactNode;
  className?: string;
}

// Tabela padrão do sistema (TanStack v8): busca, ordenação, colunas visíveis e paginação.
// Uso: <DataTable columns={cols} data={rows} searchPlaceholder="Buscar venda..." />
export function DataTable<TData, TValue>({
  columns, data, searchPlaceholder = "Buscar...", pageSize = 15,
  loading = false, emptyText = "Nenhum registro encontrado.", onRowClick, toolbar, headerEnd, className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Barra de ferramentas + tabela juntas num box só */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#171717]">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 p-3">
        {searchPlaceholder && (
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 border-gray-800 bg-[#171717] pl-8 text-sm"
            />
          </div>
        )}
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-gray-800 bg-[#171717] text-gray-300">
                <Columns3 className="h-3.5 w-3.5" /> Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Mostrar colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllColumns().filter((c) => c.getCanHide()).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                >
                  {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {headerEnd}
        </div>
      </div>

      <div>
        <Table>
          <TableHeader className="bg-[#171717]">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-gray-800 hover:bg-transparent">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className="h-10 text-xs font-medium text-gray-400">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 transition hover:text-gray-200"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === "asc" ? <ArrowUp className="h-3 w-3 text-brand-gold" />
                            : dir === "desc" ? <ArrowDown className="h-3 w-3 text-brand-gold" />
                            : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-gray-800">
                <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> carregando...</span>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="border-gray-800">
                <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-gray-500">{emptyText}</TableCell>
              </TableRow>
            ) : rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn("border-gray-800/70 transition hover:bg-brand-navy/60", onRowClick && "cursor-pointer")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2.5 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </div>

      {/* Paginação */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            {total} registro(s) · página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 border-gray-800 bg-[#171717]"
              onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
            <Button variant="outline" size="sm" className="h-8 border-gray-800 bg-[#171717]"
              onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
