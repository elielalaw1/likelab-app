DROP TRIGGER IF EXISTS on_deliverable_submitted ON public.deliverables;

CREATE TRIGGER on_deliverable_submitted
  AFTER UPDATE ON public.deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.scrape_submitted_deliverable();
