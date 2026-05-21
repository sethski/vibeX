export interface IdeReplacement {
  range: "active-input";
  text: string;
}

export function createIdeReplacement(optimized: string): IdeReplacement {
  return {
    range: "active-input",
    text: optimized
  };
}
