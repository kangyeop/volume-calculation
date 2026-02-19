import React from 'react';

interface ConfidenceIndicatorProps {
  confidence: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  size = 'medium',
  showLabel = true,
}) => {
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBg = (conf: number): string => {
    if (conf >= 0.8) return 'bg-green-100';
    if (conf >= 0.5) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getConfidenceText = (conf: number): string => {
    if (conf >= 0.8) return '높음';
    if (conf >= 0.5) return '중간';
    return '낮음';
  };

  const getSizeClasses = (): string => {
    switch (size) {
      case 'small':
        return 'text-xs px-2 py-1';
      case 'large':
        return 'text-sm px-3 py-1.5';
      default:
        return 'text-sm px-2.5 py-1';
    }
  };

  const percentage = Math.round(confidence * 100);

  return (
    <div className={`inline-flex items-center ${getSizeClasses()} ${getConfidenceBg(confidence)} rounded-full font-medium`}>
      <span className={getConfidenceColor(confidence)}>
        {percentage}%
      </span>
      {showLabel && (
        <span className="ml-2 text-gray-600 text-xs">
          ({getConfidenceText(confidence)})
        </span>
      )}
    </div>
  );
};