'use client';

import React from 'react';
import { RootErrorView } from '@/components/ui/RootErrorView';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const RootError: React.FC<ErrorProps> = ({ reset }) => {
  return <RootErrorView reset={reset} />;
};

export default RootError;
