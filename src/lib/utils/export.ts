import { VerificationRequestWithProfile } from '@/types/verification';
import { format } from 'date-fns';

export function exportRequestsToCSV(requests: VerificationRequestWithProfile[]): void {
  const headers = [
    'ID',
    'Name',
    'Email',
    'Type',
    'Status',
    'Submitted Date',
    'Review Date',
    'Notes'
  ];

  const rows = requests.map(request => [
    request.id,
    request.profile.display_name || 'N/A',
    request.profile.email,
    request.verification_type,
    request.status,
    format(new Date(request.submitted_at), 'yyyy-MM-dd HH:mm:ss'),
    request.reviewed_at ? format(new Date(request.reviewed_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
    request.notes || 'N/A'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `verification-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}