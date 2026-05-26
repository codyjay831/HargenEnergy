import type { ClientSetupReadiness } from "@/lib/client-setup-readiness";
import type { ClientPortalSupportSetup } from "@/lib/portal-support";
import type { ClientWalkthroughRequest } from "@/lib/portal-walkthrough";
import { PortalSetupGuideClient } from "./PortalSetupGuideClient";

type PortalSetupGuideProps = {
  readiness: ClientSetupReadiness;
  setup?: ClientPortalSupportSetup | null;
  walkthrough?: ClientWalkthroughRequest | null;
};

export function PortalSetupGuide({ readiness, setup, walkthrough }: PortalSetupGuideProps) {
  return (
    <PortalSetupGuideClient
      readiness={readiness}
      setup={setup}
      walkthrough={walkthrough}
    />
  );
}
