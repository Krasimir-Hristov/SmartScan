'use client';

import React from 'react';
import { GlobalErrorView } from '@/components/ui/GlobalErrorView';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const GlobalError: React.FC<GlobalErrorProps> = ({ reset }) => {
  return <GlobalErrorView reset={reset} />;
};

export default GlobalError;
