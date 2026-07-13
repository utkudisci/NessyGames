import React from 'react';

export interface GameMetadata {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  route: string;
  categories: string[];
  status: 'available' | 'coming-soon';
  component: React.ComponentType<any>;
  highScoreSupported: boolean;
  modes: string[];
}
