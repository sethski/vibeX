export interface TrayStatus {
  serverHealthy: boolean;
  optimizeEnabled: boolean;
  authMode: "open" | "token";
  cachePath: string;
}

export interface TrayAction {
  id: "toggle-optimize" | "clear-intent-cache" | "check-health" | "open-settings";
  label: string;
}

export interface TrayContract {
  version: 1;
  title: "vibeX";
  status: TrayStatus;
  actions: TrayAction[];
}

export function createTrayContract(status: TrayStatus): TrayContract {
  return {
    version: 1,
    title: "vibeX",
    status,
    actions: [
      { id: "toggle-optimize", label: "Enable/Disable Optimize" },
      { id: "clear-intent-cache", label: "Clear Intent Cache" },
      { id: "check-health", label: "Check Local Server Health" },
      { id: "open-settings", label: "Open Settings" }
    ]
  };
}
