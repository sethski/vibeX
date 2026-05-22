export interface IdeReplacement {
  range: "active-input";
  text: string;
}

export interface IdeBridgePayload {
  version: 1;
  replacement: IdeReplacement;
}

export function createIdeReplacement(optimized: string): IdeReplacement {
  return {
    range: "active-input",
    text: optimized
  };
}

export function createIdeBridgePayload(optimized: string): IdeBridgePayload {
  return {
    version: 1,
    replacement: createIdeReplacement(optimized)
  };
}
