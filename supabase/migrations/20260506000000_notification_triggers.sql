-- Full push + in-app notification system for LikeLab creators
-- Uses pg_net to call Expo Push API directly from triggers (no edge function needed)

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─────────────────────────────────────────────────────────────
-- Core sender: inserts in-app row + fires push via Expo API
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.notify_creator(
  p_user_id uuid,
  p_type    text,
  p_title   text,
  p_message text,
  p_link    text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_push_token text;
BEGIN
  -- 1. In-app notification (drives the bell icon in the app)
  INSERT INTO public.notifications (user_id, type, title, message, link, read)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, false);

  -- 2. Push notification via Expo Push API
  SELECT push_token INTO v_push_token
  FROM public.creator_profiles
  WHERE user_id = p_user_id;

  IF v_push_token IS NOT NULL AND v_push_token LIKE 'ExponentPushToken%' THEN
    PERFORM net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
      body    := jsonb_build_object(
        'to',       v_push_token,
        'title',    p_title,
        'body',     p_message,
        'data',     jsonb_build_object('link', p_link),
        'sound',    'default',
        'priority', 'high'
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────
-- 1. Application status changes (accepted / rejected)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.on_application_status_change()
RETURNS trigger AS $$
DECLARE
  v_campaign_name text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  SELECT name INTO v_campaign_name FROM public.campaigns WHERE id = NEW.campaign_id;

  IF NEW.status = 'accepted' THEN
    PERFORM private.notify_creator(
      NEW.creator_id,
      'application_accepted',
      '🎉 Ansökan godkänd!',
      'Du har blivit antagen till ' || COALESCE(v_campaign_name, 'en kampanj') || '. Kolla in kampanjen nu!',
      '/campaigns/' || NEW.campaign_id::text
    );

  ELSIF NEW.status = 'rejected' THEN
    PERFORM private.notify_creator(
      NEW.creator_id,
      'application_rejected',
      'Ansökan avslogs',
      'Din ansökan till ' || COALESCE(v_campaign_name, 'kampanjen') || ' valdes tyvärr inte ut den här gången.',
      '/(tabs)/applications'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_on_application_status ON public.applications;
CREATE TRIGGER notify_on_application_status
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION private.on_application_status_change();


-- ─────────────────────────────────────────────────────────────
-- 2. Deliverable assigned (INSERT) or status changed (UPDATE)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.on_deliverable_insert()
RETURNS trigger AS $$
DECLARE
  v_campaign_name text;
BEGIN
  IF NEW.creator_id IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_campaign_name FROM public.campaigns WHERE id = NEW.campaign_id;

  PERFORM private.notify_creator(
    NEW.creator_id,
    'deliverable_assigned',
    '🎥 Ny uppgift tilldelad',
    'Du har fått en ny video-uppgift i ' || COALESCE(v_campaign_name, 'en kampanj') || '. Dags att börja filma!',
    '/campaigns/' || NEW.campaign_id::text || '?tab=videos'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_on_deliverable_assigned ON public.deliverables;
CREATE TRIGGER notify_on_deliverable_assigned
  AFTER INSERT ON public.deliverables
  FOR EACH ROW
  WHEN (NEW.creator_id IS NOT NULL)
  EXECUTE FUNCTION private.on_deliverable_insert();


CREATE OR REPLACE FUNCTION private.on_deliverable_status_change()
RETURNS trigger AS $$
DECLARE
  v_campaign_name text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  SELECT name INTO v_campaign_name FROM public.campaigns WHERE id = NEW.campaign_id;

  IF NEW.status = 'revision_requested' THEN
    PERFORM private.notify_creator(
      NEW.creator_id,
      'deliverable_revision',
      '✏️ Revision begärd',
      'En revision har begärts på din video i ' || COALESCE(v_campaign_name, 'kampanjen') || '. Kolla feedbacken.',
      '/campaigns/' || NEW.campaign_id::text || '?tab=videos'
    );

  ELSIF NEW.status = 'published' OR NEW.status = 'approved' THEN
    PERFORM private.notify_creator(
      NEW.creator_id,
      'deliverable_approved',
      '✅ Video godkänd!',
      'Din video i ' || COALESCE(v_campaign_name, 'kampanjen') || ' har godkänts. Bra jobbat!',
      '/campaigns/' || NEW.campaign_id::text || '?tab=videos'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_on_deliverable_status ON public.deliverables;
CREATE TRIGGER notify_on_deliverable_status
  AFTER UPDATE OF status ON public.deliverables
  FOR EACH ROW
  EXECUTE FUNCTION private.on_deliverable_status_change();


-- ─────────────────────────────────────────────────────────────
-- 3. Campaign invitation
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.on_campaign_invitation()
RETURNS trigger AS $$
DECLARE
  v_campaign_name text;
BEGIN
  SELECT name INTO v_campaign_name FROM public.campaigns WHERE id = NEW.campaign_id;

  PERFORM private.notify_creator(
    NEW.creator_id,
    'campaign_invitation',
    '✨ Du är inbjuden!',
    'Du har blivit personligt inbjuden till kampanjen ' || COALESCE(v_campaign_name, '(ny kampanj)') || '. Kolla in det!',
    '/campaigns/' || NEW.campaign_id::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_on_campaign_invitation ON public.campaign_invitations;
CREATE TRIGGER notify_on_campaign_invitation
  AFTER INSERT ON public.campaign_invitations
  FOR EACH ROW
  EXECUTE FUNCTION private.on_campaign_invitation();


-- ─────────────────────────────────────────────────────────────
-- 4. Creator account approved
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.on_creator_review_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.review_status IS NOT DISTINCT FROM NEW.review_status THEN RETURN NEW; END IF;

  IF NEW.review_status = 'approved' THEN
    PERFORM private.notify_creator(
      NEW.user_id,
      'account_approved',
      '🎉 Kontot godkänt!',
      'Grattis! Ditt LikeLab creator-konto är nu godkänt. Börja ansöka till kampanjer direkt!',
      '/(tabs)/overview'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_on_creator_approved ON public.creator_profiles;
CREATE TRIGGER notify_on_creator_approved
  AFTER UPDATE OF review_status ON public.creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.on_creator_review_status_change();
