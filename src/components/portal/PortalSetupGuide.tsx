import type { ClientSetupReadiness } from "@/lib/client-setup-readiness";
import type { ClientPortalSupportSetup } from "@/lib/portal-support";
import type { ClientDiscoveryRequest } from "@/lib/portal-discovery";
import { PortalSetupGuideClient } from "./PortalSetupGuideClient";

type PortalSetupGuideProps = {
  readiness: ClientSetupReadiness;
  setup?: ClientPortalSupportSetup | null;
  discovery?: ClientDiscoveryRequest | null;
};

export function PortalSetupGuide({ readiness, setup, discovery }: PortalSetupGuideProps) {
  return (
    <PortalSetupGuideClient
      readiness={readiness}
      setup={setup}
      discovery={discovery}
    />
  );
}
