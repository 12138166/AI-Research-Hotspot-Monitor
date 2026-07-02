export type HNOriginSegment = "frontpage" | "ask_hn" | "show_hn" | "newcomments";

export interface HNStory {
  id: string;
  title: string;
  url: string;
  points: number;
  author: string;
  commentsCount: number;
  createdAt: string;
  aiSummary?: string;
  categoryTag?: "academic" | "technical" | "marketing";
  originSegment?: HNOriginSegment;
  commentContext?: string;       // Context snippet if extracted from a comment
  commentAuthor?: string;        // Comment submitter if extracted from a comment
  commentParentTitle?: string;   // Thread title if extracted from a comment
  readStatus?: "reading" | "completed"; // Read status for bookmarks
}

export interface CategoryData {
  count: number;
  hotspots: string[];
  executiveSummary: string;
  items: HNStory[];
}

export interface AssociationNode {
  id: string;
  label: string;
  category: "academic" | "technical" | "marketing";
  size: number;
  matchCount: number;
}

export interface AssociationLink {
  source: string;
  target: string;
  value: number;
}

export interface MonitorData {
  lastUpdated: string;
  isCached: boolean;
  postCount: number;
  categories: {
    academic: CategoryData;
    technical: CategoryData;
    marketing: CategoryData;
  };
  globalStats: {
    distribution: { name: string; value: number }[];
    topEntities: string[];
    generalInsights: string;
  };
  communitySentiment?: {
    optimistic: number;
    worried: number;
    excited: number;
    skeptical: number;
    analysis: string;
  };
  associationNetwork?: {
    nodes: AssociationNode[];
    links: AssociationLink[];
  };
}

export interface AssociationMutationAlert {
  id: string;
  sourceLabel: string;
  targetLabel: string;
  oldValue: number;
  newValue: number;
  timestamp: string;
  reason: string;
  type: 'academic' | 'technical' | 'marketing' | 'general';
  isRead?: boolean;
}

