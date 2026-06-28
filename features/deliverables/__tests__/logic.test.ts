import { isAwaitingLink } from '@/features/deliverables/logic'
import type { Deliverable } from '@/features/core/types'

// "Awaiting link" = brand-approved but the creator hasn't posted on TikTok + pasted
// the link yet. Drives the Projects "Ready to post" CTA and the badge counts, so a
// regression here either hides the call-to-action or mis-badges a finished item.
type D = Pick<Deliverable, 'url' | 'status' | 'approvalStatus' | 'readyForPosting'>
const make = (over: Partial<D>): D => ({
  url: null,
  status: 'submitted',
  approvalStatus: 'pending',
  readyForPosting: false,
  ...over,
})

describe('isAwaitingLink', () => {
  it('is false while still pending upload / under review', () => {
    expect(isAwaitingLink(make({ status: 'pending' }))).toBe(false)
    expect(isAwaitingLink(make({}))).toBe(false)
  })

  it('is true once the brand approves but no link is posted', () => {
    expect(isAwaitingLink(make({ status: 'approved', approvalStatus: 'approved' }))).toBe(true)
  })

  it('is true when the readyForPosting flag is set', () => {
    expect(isAwaitingLink(make({ readyForPosting: true }))).toBe(true)
  })

  it('is false once a TikTok link has been posted', () => {
    expect(isAwaitingLink(make({ approvalStatus: 'approved', url: 'https://www.tiktok.com/@x/video/1' }))).toBe(false)
  })

  it('is false when published', () => {
    expect(isAwaitingLink(make({ status: 'published', approvalStatus: 'approved' }))).toBe(false)
  })

  it('is false when rejected or in revision', () => {
    expect(isAwaitingLink(make({ approvalStatus: 'rejected' }))).toBe(false)
    expect(isAwaitingLink(make({ status: 'revision_requested', approvalStatus: 'approved' }))).toBe(false)
  })
})
