import type { Metadata } from 'next';
import { AlertPanel } from '@/components/alert-panel';
import { BackButton } from '@/components/back-button';

export const metadata: Metadata = {
  title: '汇率追踪预警',
  description: '实时汇率监控与目标汇率预警通知',
};

export default function AlertPage() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <BackButton label="汇率追踪预警" />
      <div className="flex-1 overflow-hidden">
        <AlertPanel />
      </div>
    </div>
  );
}
