export interface CopilotAdapterTemplate {
  version: 1;
  hook: "pre-send";
  request: {
    endpoint: "/optimize";
    shape: "raw_prompt+ide_context";
  };
  replacement: {
    mode: "active-input";
    sourceField: "stp_prompt";
  };
}

export function createCopilotAdapterTemplate(): CopilotAdapterTemplate {
  return {
    version: 1,
    hook: "pre-send",
    request: {
      endpoint: "/optimize",
      shape: "raw_prompt+ide_context"
    },
    replacement: {
      mode: "active-input",
      sourceField: "stp_prompt"
    }
  };
}
