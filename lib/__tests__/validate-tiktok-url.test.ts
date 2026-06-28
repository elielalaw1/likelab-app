import { isValidTikTokUrl } from '@/lib/validate-tiktok-url'

// Critical flow: deliverable submit. A creator pastes the link to their posted
// TikTok video. If this validation lets a bad link through, the brand can't
// verify the post; if it wrongly rejects a valid one, the creator is blocked.
describe('isValidTikTokUrl', () => {
  it('accepts standard tiktok.com video links', () => {
    expect(isValidTikTokUrl('https://www.tiktok.com/@user/video/1234567890')).toBe(true)
    expect(isValidTikTokUrl('https://tiktok.com/@user/video/1234567890')).toBe(true)
  })

  it('accepts mobile and short-link subdomains', () => {
    expect(isValidTikTokUrl('https://m.tiktok.com/v/1234567890')).toBe(true)
    expect(isValidTikTokUrl('https://vm.tiktok.com/ZMabc123/')).toBe(true)
  })

  it('accepts vt. short links and a bare tiktok.com domain', () => {
    expect(isValidTikTokUrl('https://vt.tiktok.com/ZSabc123/')).toBe(true)
    expect(isValidTikTokUrl('https://tiktok.com')).toBe(true)
  })

  it('tolerates surrounding whitespace (pasted links)', () => {
    expect(isValidTikTokUrl('   https://www.tiktok.com/@user/video/1  ')).toBe(true)
  })

  it('rejects non-tiktok and malformed links', () => {
    expect(isValidTikTokUrl('https://instagram.com/p/abc')).toBe(false)
    expect(isValidTikTokUrl('https://nottiktok.com/@user')).toBe(false)
    expect(isValidTikTokUrl('tiktok.com/@user/video/1')).toBe(false) // missing scheme
    expect(isValidTikTokUrl('')).toBe(false)
    expect(isValidTikTokUrl('just some text')).toBe(false)
  })
})
