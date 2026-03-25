import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/QueryProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'Homescope',
  description: '서울/경기 부동산 탐색 서비스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <ErrorBoundary name="app">
            {children}
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
