import type { ClientSetupReadiness } from "@/lib/client-setup-readiness";
import type { ClientPortalSupportSetup } from "@/lib/portal-support";
import type { ClientDiscoveryRequest } from "@/lib/portal-discovery";
import type { CustomerSetupGuideSurface } from "@/components/setup-guide/setup-guide-utils";
import { PortalSetupGuideClient } from "./PortalSetupGuideClient";

type PortalSetupGuideProps = {
  readiness: ClientSetupReadiness;
  surface: CustomerSetupGuideSurface;
  setup?: ClientPortalSupportSetup | null;
  discovery?: ClientDiscoveryRequest | null;
};

export function PortalSetupGuide({
  readiness,
  surface,
  setup,
  discovery,
}: PortalSetupGuideProps) {
  return (
    <PortalSetupGuideClient
      readiness={readiness}
      surface={surface}
      setup={setup}
      discovery={discovery}
    />
  );
}
