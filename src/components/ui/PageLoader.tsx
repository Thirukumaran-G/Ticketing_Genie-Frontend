import React from 'react';
import { Spinner } from './Spinner';

export const PageLoader: React.FC = () => (
  <div className="flex h-64 items-center justify-center">
    <Spinner size="lg" />
  </div>
);
