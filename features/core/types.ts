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

export type CampaignPhase =
  | 'brief_upload'
  | 'application_period'
  | 'creator_selection'
  | 'product_sendout'
  | 'filming_period'
  | 'video_selection'
  | 'posting'

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

// Brand/admin-configured questionnaire shown in the app right after a creator
// applies (e.g. to collect a clothing size before the product is shipped).
export type CampaignApplyQuestion = {
  id: string
  label: string
  type: 'text' | 'select'
  options?: string[]
  required?: boolean
}

export type CampaignApplyForm = {
  message?: string | null
  collectSize?: boolean
  questions?: CampaignApplyQuestion[]
}

export type Campaign = {
  id: string
  title: string
  description?: string | null
  productDescription?: string | null
  applyFormEnabled?: boolean | null
  applyForm?: CampaignApplyForm | null
  brandId?: string | null
  brandName?: string | null
  startDate?: string | null
  endDate?: string | null
  status?: CampaignStatus | null
  phase?: CampaignPhase | null
  requiredVideos?: number | null
  // Gold/partner campaigns keep the pre-post brand review; standard campaigns deliver
  // link + RAW file in one step and go live directly. Backed by a campaign-tier column
  // (backend pending) — resolved in campaigns/api.ts.
  requiresReview?: boolean
  campaignTier?: 'standard' | 'gold' | 'partner' | null
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
  coverImageUrl?: string | null
  imageUrls?: string[] | null
  brandLogoUrl?: string | null
  brandInstagram?: string | null
  brandTiktok?: string | null
  creatorApplicationStatus?: ApplicationStatus | null
  invitationStatus?: string | null
  preferredCreators?: string | null
  createdAt?: string | null
}

export type CreatorProfile = {
  id: string
  email?: string | null
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
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
  tiktokFollowers?: string | null
  tiktokLikes?: string | null
  tiktokViews?: string | null
  tiktokConnected?: boolean | null
  tiktokOpenId?: string | null
  tiktokProfileUrl?: string | null
  tiktokBio?: string | null
  tiktokVerified?: boolean | null
  tiktokVideoCount?: string | null
  tiktokFollowing?: string | null
  tiktokUsername?: string | null
  tiktokDisplayName?: string | null
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
  campaignPhase?: CampaignPhase | null
  status: DeliverableStatus
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  readyForPosting?: boolean
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

// Brand → creator feedback on an uploaded video. Backed by the `deliverable_feedback`
// table (Live). The feedback text lives in the `message` column. `submissionId` ties it
// to a specific video version (nullable → deliverable-wide). `authorRole === 'system'`
// are backfilled legacy flag_reason rows, shown without an author name.
export type FeedbackAuthorRole = 'brand' | 'admin' | 'system' | 'creator'

export type DeliverableFeedback = {
  id: string
  deliverableId: string
  submissionId: string | null
  authorRole: FeedbackAuthorRole
  body: string
  readAt: string | null
  createdAt: string
}

export function mapFeedbackRow(row: Record<string, unknown>): DeliverableFeedback {
  return {
    id: String(row.id ?? ''),
    deliverableId: String(row.deliverable_id ?? ''),
    submissionId: (row.submission_id as string) ?? null,
    authorRole: (row.author_role as FeedbackAuthorRole) ?? 'brand',
    body: String(row.message ?? row.body ?? ''),
    readAt: (row.read_at as string) ?? null,
    createdAt: String(row.created_at ?? ''),
  }
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
