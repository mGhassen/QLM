import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Button } from '@guepard/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@guepard/ui/table';
import { cn } from '@guepard/ui/utils';
import { formatCurrency } from '@guepard/shared/utils';
import { DownloadIcon, ExternalLinkIcon } from 'lucide-react';

export type InvoiceType =
  | 'monthly_invoice'
  | 'credit_grant'
  | 'credit_purchase';

export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'expiring';

export type Invoice = {
  id: string;
  date: Date;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  cost: number;
  expiresAt?: Date;
};

type InvoiceHistoryProps = {
  invoices: Invoice[];
  currencyCode?: string;
  locale?: string;
  timezone?: string;
  onDownload?: (invoiceId: string) => void | Promise<void>;
  onView?: (invoiceId: string) => void | Promise<void>;
  className?: string;
};

export function InvoiceHistory({
  invoices,
  currencyCode = 'USD',
  locale = 'en-US',
  timezone,
  onDownload,
  onView,
  className,
}: InvoiceHistoryProps) {
  const { t } = useTranslation('organizations');

  const formatInvoiceType = (type: InvoiceType): string => {
    switch (type) {
      case 'monthly_invoice':
        return t('billing.invoiceHistory.type.monthlyInvoice');
      case 'credit_grant':
        return t('billing.invoiceHistory.type.creditGrant');
      case 'credit_purchase':
        return t('billing.invoiceHistory.type.creditPurchase');
      default:
        return type;
    }
  };

  const formatInvoiceStatus = (
    status: InvoiceStatus,
    expiresAt?: Date,
  ): string => {
    switch (status) {
      case 'paid':
        return t('billing.invoiceHistory.status.paid');
      case 'pending':
        return t('billing.invoiceHistory.status.pending');
      case 'failed':
        return t('billing.invoiceHistory.status.failed');
      case 'expiring':
        if (expiresAt) {
          return t('billing.invoiceHistory.status.expiringOn', {
            date: format(expiresAt, 'MMM d, yyyy'),
          });
        }
        return t('billing.invoiceHistory.status.expiring');
      default:
        return status;
    }
  };

  return (
    <div
      className={cn('space-y-4', className)}
      data-test="billing-invoice-history-section"
    >
      <div>
        <h2
          className="text-2xl font-bold tracking-tight"
          data-test="billing-invoice-history-title"
        >
          {t('billing.invoiceHistory.title')}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('billing.invoiceHistory.description', {
            timezone: timezone || 'GMT+1',
          })}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('billing.invoiceHistory.columns.date')}</TableHead>
              <TableHead>{t('billing.invoiceHistory.columns.type')}</TableHead>
              <TableHead>
                {t('billing.invoiceHistory.columns.status')}
              </TableHead>
              <TableHead>{t('billing.invoiceHistory.columns.cost')}</TableHead>
              <TableHead className="text-right">
                {t('billing.invoiceHistory.columns.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow data-test="billing-invoice-history-empty">
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  {t('billing.invoiceHistory.empty')}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-muted-foreground">
                    {format(invoice.date, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatInvoiceType(invoice.invoiceType)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatInvoiceStatus(invoice.status, invoice.expiresAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency({
                      currencyCode,
                      locale,
                      value: invoice.cost,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.status === 'paid' ||
                    invoice.status === 'pending' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload?.(invoice.id)}
                        className="text-primary hover:text-primary"
                      >
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        {t('billing.invoiceHistory.download')}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView?.(invoice.id)}
                        className="text-primary hover:text-primary"
                      >
                        <ExternalLinkIcon className="mr-2 h-4 w-4" />
                        {t('billing.invoiceHistory.view')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
