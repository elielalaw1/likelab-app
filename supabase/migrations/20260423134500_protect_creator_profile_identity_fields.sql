CREATE OR REPLACE FUNCTION public.preserve_creator_profile_identity_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(TRIM(NEW.tiktok_handle), '') = '' AND COALESCE(TRIM(OLD.tiktok_handle), '') <> '' THEN
    NEW.tiktok_handle := OLD.tiktok_handle;
  END IF;

  IF COALESCE(TRIM(NEW.avatar_url), '') = '' AND COALESCE(TRIM(OLD.avatar_url), '') <> '' THEN
    NEW.avatar_url := OLD.avatar_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_creator_profile_identity_fields ON public.creator_profiles;

CREATE TRIGGER protect_creator_profile_identity_fields
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_creator_profile_identity_fields();
