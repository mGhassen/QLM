import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnHeader, DatasourceRow } from '@guepard/domain/entities';
import { Columns2 } from 'lucide-react';
import { DataGrid } from './datagrid';
import { Button } from '../../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';

const meta: Meta<typeof DataGrid> = {
  title: 'Design System/DataGrid',
  component: DataGrid,
};

export default meta;
type Story = StoryObj<typeof DataGrid>;

const columns: ColumnHeader[] = [
  { name: 'id', displayName: 'ID', originalType: 'INTEGER', type: 'integer' },
  {
    name: 'string_col',
    displayName: 'String',
    originalType: 'VARCHAR',
    type: 'string',
  },
  {
    name: 'number_col',
    displayName: 'Number',
    originalType: 'INTEGER',
    type: 'integer',
  },
  {
    name: 'decimal_col',
    displayName: 'Decimal',
    originalType: 'DECIMAL',
    type: 'decimal',
  },
  {
    name: 'boolean_col',
    displayName: 'Boolean',
    originalType: 'BOOLEAN',
    type: 'boolean',
  },
  {
    name: 'date_col',
    displayName: 'Date',
    originalType: 'DATE',
    type: 'date',
  },
  {
    name: 'timestamp_col',
    displayName: 'Timestamp',
    originalType: 'TIMESTAMP',
    type: 'timestamp',
  },
  {
    name: 'null_col',
    displayName: 'Null',
    originalType: 'VARCHAR',
    type: 'string',
  },
  {
    name: 'json_col',
    displayName: 'JSON',
    originalType: 'JSON',
    type: 'json',
  },
];

const rows: DatasourceRow[] = Array.from({ length: 85 }, (_, i) => ({
  id: i + 1,
  string_col:
    i % 5 === 0
      ? 'This is a much longer text that will be truncated at 32 characters with an ellipsis'
      : `Item ${i + 1}`,
  number_col: (i + 1) * 100,
  decimal_col: Math.round((Math.random() * 100 + 0.5) * 100) / 100,
  boolean_col: i % 2 === 0,
  date_col: new Date(2024, 0, 1 + (i % 30)).toISOString().split('T')[0],
  timestamp_col: new Date(2024, 0, 1 + (i % 30), 10, 30).toISOString(),
  null_col: i % 7 === 0 ? null : `value ${i}`,
  json_col:
    i % 3 === 0
      ? { key: 'value', nested: { data: [1, 2, 3] } }
      : { id: i, status: i % 2 === 0 ? 'active' : 'inactive' },
}));

function ColumnVisibilityMenu({
  allColumns,
  visibleColumnNames,
  onVisibleColumnNamesChange,
}: {
  allColumns: ColumnHeader[];
  visibleColumnNames: Set<string>;
  onVisibleColumnNamesChange: (next: Set<string>) => void;
}) {
  const visibleCount = visibleColumnNames.size;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns2 className="h-4 w-4" />
          Columns
          <span className="text-muted-foreground text-xs tabular-nums">
            {visibleCount}/{allColumns.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-72 overflow-auto">
          {allColumns.map((c) => {
            const checked = visibleColumnNames.has(c.name);
            return (
              <DropdownMenuCheckboxItem
                key={c.name}
                checked={checked}
                onCheckedChange={(nextChecked) => {
                  onVisibleColumnNamesChange(
                    (() => {
                      const next = new Set(visibleColumnNames);
                      if (nextChecked) next.add(c.name);
                      else next.delete(c.name);
                      return next;
                    })(),
                  );
                }}
              >
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {c.displayName || c.name}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                    {c.type ?? c.originalType ?? ''}
                  </span>
                </div>
              </DropdownMenuCheckboxItem>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-end gap-2 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onVisibleColumnNamesChange(new Set(allColumns.map((c) => c.name)))
            }
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onVisibleColumnNamesChange(new Set())}
          >
            Hide all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DataGridHarness({
  initialColumns,
  initialRows,
  height = 700,
  pageSize = 15,
  showRowSelection = true,
  showColumnVisibility = false,
  title = 'Query Results',
}: {
  initialColumns: ColumnHeader[];
  initialRows: DatasourceRow[];
  height?: number;
  pageSize?: number;
  showRowSelection?: boolean;
  showColumnVisibility?: boolean;
  title?: string;
}) {
  const [visibleColumnNames, setVisibleColumnNames] = React.useState<
    Set<string>
  >(() => new Set(initialColumns.map((c) => c.name)));

  const visibleColumns = React.useMemo(
    () => initialColumns.filter((c) => visibleColumnNames.has(c.name)),
    [initialColumns, visibleColumnNames],
  );

  return (
    <div className="space-y-2">
      {showColumnVisibility && (
        <div className="flex items-center justify-end">
          <ColumnVisibilityMenu
            allColumns={initialColumns}
            visibleColumnNames={visibleColumnNames}
            onVisibleColumnNamesChange={setVisibleColumnNames}
          />
        </div>
      )}
      <div style={{ height }}>
        <DataGrid
          columns={visibleColumns}
          rows={initialRows}
          title={title}
          showRowSelection={showRowSelection}
          pageSize={pageSize}
          stat={{ rowsRead: initialRows.length, queryDurationMs: 142 }}
          onDownloadCSV={() => alert('Download CSV')}
          onCopyPage={() => alert('Copy page')}
        />
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div className="h-[700px]">
      <DataGrid
        columns={columns}
        rows={rows}
        title="Query Results"
        pageSize={15}
        stat={{ rowsRead: 85, queryDurationMs: 142 }}
        onDownloadCSV={() => alert('Download CSV')}
      />
      <p className="text-muted-foreground mt-2 text-xs">
        Stats, pagination, actions menu (Export CSV, Copy page). Text truncates
        at 32 chars. Double-click a row to open the sheet sidebar with full
        data.
      </p>
    </div>
  ),
};

export const ColumnVisibility: Story = {
  render: () => (
    <div className="h-[760px] p-2">
      <DataGridHarness
        initialColumns={columns}
        initialRows={rows}
        showColumnVisibility
      />
    </div>
  ),
};

export const ManyColumnsStickyFirstColumn: Story = {
  render: () => {
    const longColumns: ColumnHeader[] = [
      {
        name: 'id',
        displayName: 'ID',
        originalType: 'INTEGER',
        type: 'integer',
      },
      ...Array.from(
        { length: 36 },
        (_, i): ColumnHeader => ({
          name: `col_${i + 1}`,
          displayName: `Column ${i + 1}`,
          originalType:
            i % 6 === 0 ? 'JSON' : i % 5 === 0 ? 'TIMESTAMP' : 'VARCHAR',
          type: i % 6 === 0 ? 'json' : i % 5 === 0 ? 'timestamp' : 'string',
        }),
      ),
    ];

    const longRows: DatasourceRow[] = Array.from({ length: 60 }, (_, r) => {
      const row: Record<string, unknown> = { id: r + 1 };
      for (let c = 1; c <= 36; c++) {
        const key = `col_${c}`;
        if (c % 6 === 0)
          row[key] = { r, c, nested: { ok: true, v: [1, 2, 3] } };
        else if (c % 5 === 0)
          row[key] = new Date(2024, 0, 1 + r, 10, c).toISOString();
        else if (c % 3 === 0) row[key] = (r + 1) * c * 1.01;
        else row[key] = `row ${r + 1} / col ${c} / ${'x'.repeat(24)}`;
      }
      return row;
    });

    return (
      <div className="h-[760px] p-2">
        <div className="text-muted-foreground mb-2 text-xs">
          Scroll horizontally to verify the sticky first column (checkbox) and
          row numbers.
        </div>
        <DataGrid
          columns={longColumns}
          rows={longRows}
          title="Many columns (sticky first column)"
          showRowSelection
          pageSize={20}
          stat={{ rowsRead: longRows.length, queryDurationMs: 420 }}
        />
      </div>
    );
  },
};

export const NoSelectionColumn: Story = {
  render: () => (
    <div className="h-[700px] p-2">
      <DataGrid
        columns={columns}
        rows={rows}
        title="No selection column"
        showRowSelection={false}
        pageSize={15}
        stat={{ rowsRead: rows.length, queryDurationMs: 142 }}
      />
    </div>
  ),
};

export const SingleRowHugeJson: Story = {
  render: () => {
    const singleColumns: ColumnHeader[] = [
      {
        name: 'id',
        displayName: 'ID',
        originalType: 'INTEGER',
        type: 'integer',
      },
      {
        name: 'payload',
        displayName: 'Payload',
        originalType: 'JSONB',
        type: 'json',
      },
      {
        name: 'created_at',
        displayName: 'Created at',
        originalType: 'TIMESTAMP',
        type: 'timestamp',
      },
    ];
    const singleRows: DatasourceRow[] = [
      {
        id: 1,
        created_at: new Date().toISOString(),
        payload: {
          meta: {
            source: 'storybook',
            tags: Array.from({ length: 40 }, (_, i) => `tag_${i}`),
          },
          items: Array.from({ length: 80 }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            ok: i % 3 === 0,
            score: Math.round(Math.random() * 1000) / 10,
          })),
        },
      },
    ];
    return (
      <div className="h-[520px] p-2">
        <div className="text-muted-foreground mb-2 text-xs">
          Hover truncated JSON to see tooltip; double-click row to open the
          right sheet with formatted JSON.
        </div>
        <DataGrid
          columns={singleColumns}
          rows={singleRows}
          title="Single row / huge JSON"
          showRowSelection
          pageSize={10}
          stat={{ rowsRead: 1, queryDurationMs: 12 }}
        />
      </div>
    );
  },
};
