export type CampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'open'
  | 'reviewing'
  | 'creating'
  | 'completed'
  | 'paused'
  | 'ended'
  | 'rejected'
  | 'cancelled'

export type ApplicationStatus = 'applied' | 'accepted' | 'rejected' | 'withdrawn'

export type DeliverableStatus =
  | 'pending'
  | 'submitted'
  | 'flagged'
  | 'revision_requested'
  | 'uploaded'
  | 'pending_review'
  | 'approved'
  | 'published'

export type Campaign = {
  id: string
  title: string
  description?: string | null
  brandId?: string | null
  brandName?: string | null
  startDate?: string | null
  endDate?: string | null
  status?: CampaignStatus | null
  requiredVideos?: number | null
  rewardType?: string | null
  rewardValue?: string | null
  rewardAmount?: number | null
  rewardDescription?: string | null
  campaignGoal?: string | null
  videoRequirements?: string | null
  briefGuidelines?: string | null
  instructions?: string | null
  brandVoice?: string | null
  brandTone?: string | null
  targetAudience?: string | null
  platforms?: string[] | null
  exampleLinks?: string[] | null
  creationDays?: number | null
  reviewDays?: number | null
  contentRightsDays?: number | null
  creatorLimit?: number | null
  requiredDisclosure?: string | null
  thingsToAvoid?: string | null
  requiredHashtags?: string[] | null
  keyMessages?: string[] | null
  prizeDistribution?: number[] | null
  level?: string | null
  coverImageUrl?: string | null
  brandLogoUrl?: string | null
  creatorApplicationStatus?: ApplicationStatus | null
  invitationStatus?: string | null
  preferredCreators?: string | null
}

export type CreatorProfile = {
  id: string
  email?: string | null
  displayName?: string | null
  phoneCountryCode?: string | null
  phone?: string | null
  tiktokHandle?: string | null
  instagramHandle?: string | null
  gender?: string | null
  ageRange?: string | null
  country?: string | null
  county?: string | null
  city?: string | null
  address?: string | null
  postalCode?: string | null
  primaryCategory?: string | null
  secondaryCategory?: string | null
  avatarUrl?: string | null
  reviewStatus?: string | null
  completionPercentage: number
  approved: boolean
}

export type CreatorApplication = {
  id: string
  campaignId: string
  campaignTitle: string
  campaignImageUrl?: string | null
  campaignBrandName?: string | null
  status: ApplicationStatus
  rewardAmount?: number | null
  rewardType?: string | null
  startDate?: string | null
  endDate?: string | null
  createdAt?: string | null
}

export type CreatorInvitation = {
  id: string
  campaignId: string
  status: string
  createdAt?: string | null
  campaignTitle: string
  campaignImageUrl?: string | null
  campaignBrandName?: string | null
  rewardAmount?: number | null
  rewardType?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type Deliverable = {
  id: string
  campaignId: string
  campaignTitle: string
  campaignBrandName?: string | null
  status: DeliverableStatus
  platform: string
  type?: string | null
  url?: string | null
  notes?: string | null
  flagReason?: string | null
}

export type SubmissionType = 'link' | 'video'

export type SubmissionStatus = 'uploading' | 'processing' | 'submitted' | 'failed'

export type DeliverableSubmission = {
  id: string
  deliverableId: string
  creatorId: string
  submissionType: SubmissionType
  status: SubmissionStatus
  linkUrl: string | null
  videoStoragePath: string | null
  videoFilename: string | null
  videoSizeBytes: number | null
  videoMimeType: string | null
  externalAssetUrl: string | null
  externalAssetProvider: string | null
  errorMessage: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export function mapSubmissionRow(row: Record<string, unknown>): DeliverableSubmission {
  return {
    id: String(row.id ?? ''),
    deliverableId: String(row.deliverable_id ?? ''),
    creatorId: String(row.creator_id ?? ''),
    submissionType: (row.submission_type as SubmissionType) ?? 'link',
    status: (row.status as SubmissionStatus) ?? 'uploading',
    linkUrl: (row.link_url as string) ?? null,
    videoStoragePath: (row.video_storage_path as string) ?? null,
    videoFilename: (row.video_filename as string) ?? null,
    videoSizeBytes: (row.video_size_bytes as number) ?? null,
    videoMimeType: (row.video_mime_type as string) ?? null,
    externalAssetUrl: (row.external_asset_url as string) ?? null,
    externalAssetProvider: (row.external_asset_provider as string) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}
