'use client';

import React from 'react';
import { StayErrorView } from '@/features/stay';

interface StayErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const StayError: React.FC<StayErrorProps> = ({ reset }) => {
  return <StayErrorView reset={reset} />;
};

export default StayError;
