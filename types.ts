export type VideoStats = {
  videoId: string;
  title?: string;
  coverUrl?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  updatedAt?: string;
};

export type StatsResponse = VideoStats;
