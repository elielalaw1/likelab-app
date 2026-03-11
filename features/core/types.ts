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
  | 'uploaded'
  | 'pending_review'
  | 'approved'
  | 'revision_requested'
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
  requiredDisclosure?: string | null
  thingsToAvoid?: string | null
  requiredHashtags?: string[] | null
  keyMessages?: string[] | null
  prizeDistribution?: number[] | null
  level?: string | null
  coverImageUrl?: string | null
  creatorApplicationStatus?: ApplicationStatus | null
  invitationStatus?: string | null
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
}
