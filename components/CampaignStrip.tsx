

import React from 'react';
import { BannerResult, PlatformPreset, Comment, MagicAction, MotionEffect } from '../types';
import { BannerCard } from './BannerCard';
import { ArrowRight, Layers } from 'lucide-react';

interface CampaignStripProps {
  campaignId: string;
  banners: BannerResult[];
  onRegenerate: (id: string, instruction: string) => void;
  onPreview: (url: string) => void;
  platformPreset: PlatformPreset;
  isReviewMode: boolean;
  onAddComment: (id: string, comment: Comment) => void;
  onCheckSafety: (id: string) => void;
  onMagicAction: (id: string, action: MagicAction) => void;
  onApplyMotion: (id: string, effect: MotionEffect) => void;
}

export const CampaignStrip: React.FC<CampaignStripProps> = ({
  campaignId,
  banners,
  onRegenerate,
  onPreview,
  platformPreset,
  isReviewMode,
  onAddComment,
  onCheckSafety,
  onMagicAction,
  onApplyMotion
}) => {
  // Sort banners by stage if possible, otherwise by timestamp
  const sortedBanners = [...banners].sort((a, b) => {
    if (a.stage && b.stage) {
      return a.stage.localeCompare(b.stage);
    }
    return a.timestamp - b.timestamp;
  });

  return (
    <div className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 mb-8 relative group/strip">
      <div className="absolute -top-3 left-6 bg-brand-red text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
        <Layers size={12} />
        CHIẾN DỊCH: #{campaignId.substring(0, 6)}
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2">
        {sortedBanners.map((banner, index) => (
          <React.Fragment key={banner.id}>
            <div className="flex flex-col gap-2 min-w-[280px] max-w-[280px]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {banner.stage?.split('(')[0] || `SLIDE ${index + 1}`}
                </span>
                <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                   {banner.stage?.split('(')[1]?.replace(')', '') || 'Auto'}
                </span>
              </div>
              
              <div className="aspect-square w-full">
                <BannerCard 
                  banner={banner}
                  onRegenerate={onRegenerate}
                  onPreview={onPreview}
                  platformPreset={platformPreset}
                  isReviewMode={isReviewMode}
                  onAddComment={onAddComment}
                  onCheckSafety={onCheckSafety}
                  onMagicAction={onMagicAction}
                  onApplyMotion={onApplyMotion}
                />
              </div>
            </div>

            {/* Connector Arrow */}
            {index < sortedBanners.length - 1 && (
              <div className="flex flex-col items-center justify-center opacity-30 text-gray-400 dark:text-gray-600">
                <div className="h-px w-8 bg-current mb-1"></div>
                <ArrowRight size={24} />
                <div className="h-px w-8 bg-current mt-1"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
