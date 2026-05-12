import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-doorbell",
  description: "Print a QR sticker for your door — friend scans it, your phone rings",
  accentHex: "#2cb67d",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
